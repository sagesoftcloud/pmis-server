/***
 * File name: user.js
 *
 * Description:
 * Schema for User model to map the data that will be stored in the database.
 *
 * - Creates a schema for User model that serves as a structure for all
 *   documents inside of User collection in the database. For more
 *   information about schema check https://mongoosejs.com/docs/guide.html.
 * - Creates data view and search statics. For more information about statics
 *   check https://mongoosejs.com/docs/guide.html#statics.
 *   - Data view and search are used to create aggregation pipelines for
 *     processing data.
 *  - Creates pre-save hook. For more information about hooks check
 *    https://mongoosejs.com/docs/middleware.html.
 *   - Pre-save hook process the data first before saving it to database.
 *
 * Module Exports:
 * - model: The User model with statics and configurations.
 */

/* eslint-disable require-await */
// Rule is needed to be disabled for Mongoose
/* eslint-disable no-invalid-this */
// Rule is needed to be disabled for the ObjectId to be parsed correctly
/* eslint-disable new-cap */
const { Schema, Types } = require('mongoose')
const { schemaFactory, modelFactory } = require('mongodb-plugin')
const { isEmail } = require('validator')
const { ObjectId } = Types
const {
    lookupUnwind,
    generateSearch,
    matchNotDeleted,
    getFullName
} = require('./lib/utils')

const attachment = require('../schema/attachment')
const { maxFileUploadSize } = require('../config')
const moment = require('moment')

const {
    padDates = true,
    padTimes = true,
    timezone,
    dateFormat
} = require('../config/meta')
const aggregationHelper = require('../lib/aggregationHelpers')({
    padDates,
    padTimes
})
const autopopulate = require('mongoose-autopopulate')
const sanitize = require('mongo-sanitize')

const isPhilippineMobileNumber = (mobileNumber) => mobileNumber.match(/^[(]\+63[)]\d{10}$/u)

const schema = new Schema(
    {
        employeeType: {
            type: String,
            required: [
                true,
                'Employee type is required'
            ],
            enum: [
                'Probationary Employee',
                'Regular Employee',
                'Term Employee',
                'Project Employee'
            ],
            index: true
        },
        role: {
            type: String,
            required: [
                true,
                'Employee role is required.'
            ],
            index: true
        },
        firstName: {
            type: String,
            required: [
                true,
                'First name is required.'
            ]
        },
        middleName: {
            type: String
        },
        lastName: {
            type: String,
            required: [
                true,
                'Last name is required.'
            ]
        },
        position: {
            type: String,
            required: [
                true,
                'Position is required.'
            ]
        },
        employeeId: {
            type: String,
            required: [
                true,
                "Employee ID is required"
            ],
            index: true
        },
        department: {
            type: ObjectId,
            ref: 'Department',
            required: [
                true,
                'Department is required.'
            ]
        },
        immediateSupervisor: {
            type: String,
            required: [
                true,
                'Please provide immediate supervisor.'
            ]

        },
        dateOfEmployment: {
            type: Date,
            required: [
                true,
                'Date of employment is required.'
            ]
        },
        dateOfBirth: {
            type: Date,
            required: [
                true,
                'Date of birth is required.'
            ]
        },
        email: {
            type: String,
            required: [
                true,
                'E-mail address is required.'
            ],
            immutable: true,
            index: true
        },
        mobileNumber: {
            type: String,
            required: [
                true,
                'Mobile number is required.'
            ]
        },
        userRole: {
            type: [ String ],
            required: [
                true,
                'User role is required.'
            ]
        },
        profilePicture: {
            type: attachment
        },
        zoom: {
            type: Number,
            default: 100
        },

        createdBy: {
            type: ObjectId,
            ref: 'User',
            default: null
        },
        updatedBy: {
            type: ObjectId,
            ref: 'User',
            default: null
        },
        deactivationReason: {
            type: 'String'
        },
        statusUpdatedBy: {
            _id: {
                type: Object,
                ref: 'User'
            },
            name: {
                type: String
            }
        },
        userType: {
            type: String,
            default: 'Internal'
        },
        label: {
            type: String
        },
        overdueNotification: {
            type: String,
            default: "always"
        }
    },
    {
        autoCreate: true,
        timestamps: {
            createdAt: 'dateCreated',
            updatedAt: 'dateUpdated'
        },
        collation: {
            locale: 'en_US',
            strength: 1
        }
    }
)

schema.methods.validateDate = function (date, field) {
    const dateNow = moment().format('YYYY-MM-DD')
    const dateToCheck = moment(date).format('YYYY-MM-DD')

    if(dateNow < dateToCheck) {
        throw new Error(`"${dateToCheck}" ${field} is not valid.`)
    }
}

schema.methods.validateEmployeeId = async function () {
    if(isNaN(this.employeeId)) {
        throw new Error('EmployeeId must be numeric.')
    }

    if(this.isNew) {
        const sameEmployeeId = await this.constructor.findOne({
            employeeId: this.employeeId
        })

        if(sameEmployeeId) {
            throw new Error("Employee ID is taken.")
        }
    }
}

schema.methods.validateMapping = async function () {
    if(this.projects && this.projects.length > 0 && this.isModified('department')) {
        throw new Error("User is currently mapped to other document(s).")
    }

    if(!this.role) {
        throw new Error("Role field cannot be empty.")
    }
}

schema.methods.validateEmail = async function () {
    if(!isEmail(this.email)) {
        throw new Error('E-mail should be a valid e-mail address.')
    }

    const found = await this.constructor.findOne({
        email: sanitize(this.email)
    })

    if (found) {
        throw new Error(`"${this.email}" email already exists.`)
    }
}

schema.pre('save', async function (next) {
    const createMode = this.isNew
    const updateMode = !this.isNew

    if(this._status !== 'deleted') {
        this.label = this.role

        if(createMode) {
            await this.validateEmail()
            this.validateDate(this.dateOfBirth, 'date of birth')
            this.validateDate(this.dateOfEmployment, 'date of employment')
        }

        else if (updateMode) {
            await this.validateMapping()
        }

        // code below will validate both on createMode and updateMode
        if(!isPhilippineMobileNumber(this.mobileNumber)) {
            throw new Error('Mobile Number should be a valid Philippine Mobile Number.')
        }

        await this.validateEmployeeId()
    }

    next()
})

schema.statics.upload = {
    profilePicture: {
        dest: 'profile',
        folder: 'attachments',
        mimeTypes: [
            "image/jpeg",
            "image/png"
        ],
        maxCount: 1,
        maxFileUploadSize
    }
}

const lookupsCommon = [
    ...lookupUnwind({
        from: 'users',
        localField: 'createdBy'
    }),
    ...lookupUnwind({
        from: 'users',
        localField: 'updatedBy'
    }),
    ...lookupUnwind({
        from: 'departments',
        localField: 'department'
    })
]

const projectDefault = [
    {
        $addFields: {
            name: {
                firstName: '$firstName',
                middleName: '$middleName',
                lastName: '$lastName'
            }
        }
    },
    {
        $addFields: {
            fullName: getFullName('$name'),
            createdBy: {
                $concat: [
                    '$createdBy.firstName',
                    ' ',
                    '$createdBy.lastName'
                ]
            },
            updatedBy: {
                $concat: [
                    '$updatedBy.firstName',
                    ' ',
                    '$updatedBy.lastName'
                ]
            },
            dateOfEmployment: {
                $dateToString: {
                    date: '$dateOfEmployment',
                    timezone: timezone,
                    format: dateFormat
                }
            },
            dateOfBirth: {
                $dateToString: {
                    date: '$dateOfBirth',
                    timezone: timezone,
                    format: dateFormat
                }
            }
        }
    },
    {
        $project: {
            name: 0,
            __v: 0
        }
    }
]

const projectTable = [
    {
        $addFields: {
            name: {
                firstName: '$firstName',
                middleName: '$middleName',
                lastName: '$lastName'
            }
        }
    },
    {
        $addFields: {
            fullName: getFullName('$name')
        }
    },
    {
        $project: {
            employeeId: 1,
            fullName: 1,
            label: 1,
            dateCreated: 1,
            _status: 1,
            profilePicture: 1,
            overdueNotification: 1
        }
    }
]

const projectProjectUsers = [
    {
        $addFields: {
            fullName: {
                $concat: [
                    '$firstName',
                    ' ',
                    '$lastName'
                ]
            }
        }
    },
    {
        $match: {
            department: {
                $exists: true
            }
        }
    },
    {
        $project: {
            department: 1,
            role: 1,
            user: {
                name: '$fullName',
                _id: '$_id',
                url: '$profilePicture'
            }
        }
    },
    {
        $group: {
            _id: {
                _id: '$department._id',
                name: '$department.name'
            },
            members: {
                $push: '$user'
            }
        }
    },
    {
        $project: {
            _id: '$_id._id',
            name: '$_id.name',
            members: '$members'
        }
    }
]

const projectSupervisors = [
    {
        $addFields: {
            name: {
                firstName: '$firstName',
                middleName: '$middleName',
                lastName: '$lastName'
            }
        }
    },
    {
        $addFields: {
            fullName: getFullName('$name')
        }
    },
    {
        $project: {
            fullName: 1
        }
    }
]

const defaultAgg = [
    matchNotDeleted(),
    ...aggregationHelper.to12HourString({
        fieldName: 'dateCreated'
    }),
    ...aggregationHelper.to12HourString({
        fieldName: 'dateUpdated'
    }),
    ...lookupsCommon
]

schema.statics.dataView = {
    default: [
        ...defaultAgg,
        ...projectDefault
    ],
    table: [
        ...defaultAgg,
        ...projectTable
    ],
    projectUsers: [
        ...defaultAgg,
        ...projectProjectUsers
    ],
    archivedUsers: [
        {
            $match: {
                _status: 'deleted'
            }
        },
        ...aggregationHelper.to12HourString({
            fieldName: 'dateCreated'
        }),
        ...aggregationHelper.to12HourString({
            fieldName: 'dateUpdated'
        }),
        ...lookupsCommon,
        ...projectDefault
    ],
    supervisors: [
        ...defaultAgg,
        ...projectSupervisors
    ]
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [
            'employeeId',
            'fullName',
            'label',
            'dateCreated',
            '_status'
        ]

        return generateSearch(search, searchAttributes)
    },
    table: function (search) {
        const searchAttributes = [
            'employeeId',
            'fullName',
            'label',
            'dateCreated',
            '_status'
        ]

        return generateSearch(search, searchAttributes)
    },
    archivedUsers: function (search) {
        const searchAttributes = [
            'employeeId',
            'fullName',
            'label',
            'dateCreated',
            '_status'
        ]

        return generateSearch(search, searchAttributes)
    },
    projectUsers: function (search) {
        const searchAttributes = [
            'members.name',
            'name'
        ]

        return generateSearch(search, searchAttributes)
    }
}
schema.plugin(autopopulate)
const modifiedSchema = schemaFactory(schema)

modifiedSchema.index({
    firstName: 1,
    lastName: 1
})

modifiedSchema.index({
    dateCreated: 1
})

const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'User'
})
module.exports = model