/***
 * File name: department.js
 *
 * Description:
 * Schema for Project Task model to map the data that will be stored in the database.
 *
 * - Creates a schema for Project Task model that serves as a structure for all
 *   documents inside of Project Task collection in the database. For more
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
 * - model: The Department model with statics and configurations.
 */

/* eslint-disable require-await */
// Rule is needed to be disabled for Mongoose
/* eslint-disable no-invalid-this */
// Rule is needed to be disabled for the ObjectId to be parsed correctly
/* eslint-disable new-cap */
const { Schema, Types } = require('mongoose')
const { schemaFactory, modelFactory } = require('mongodb-plugin')
const { ObjectId } = Types

const {
    padDates = true,
    padTimes = true,
    HARD_DELETE
} = require('../config/meta')
const aggregationHelper = require('../lib/aggregationHelpers')({
    padDates,
    padTimes
})

const {
    getFullName,
    lookupUnwind,
    validateTableRelationship,
    generateSearch,
    matchNotDeleted
} = require('./lib/utils')

const autopopulate = require('mongoose-autopopulate')

const schema = new Schema(
    {
        name: {
            type: String,
            required: [
                true,
                'Department Name is required.'
            ],
            unique: true
        },
        description: {
            type: String
        },
        createdBy: {
            type: ObjectId,
            ref: 'User'
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

schema.statics.hardDelete = HARD_DELETE.DEPARTMENT

schema.methods.validateMapping = async function () {
    if(this.isModified('name') || this.isModified('description')) {
        const mappedDepartment = await this.constructor.aggregate([
            {
                $match: {
                    _status: {
                        $ne: 'deleted'
                    },
                    _id: this._id
                }
            },
            ...validateTableRelationship('users', 'department', false, 'hasRelatedUser'),
            ...validateTableRelationship('projects', 'departments', true, 'hasRelatedProject'),
            {
                $addFields: {
                    hasRelatedData: {
                        $cond: {
                            if: {
                                $or: [
                                    '$hasRelatedUser',
                                    '$hasRelatedProject'
                                ]
                            },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $match: {
                    hasRelatedData: true
                }
            }
        ])

        if(mappedDepartment.length) {
            throw new Error('Department is currently mapped to other document(s).')
        }
    }
}

schema.pre('save', async function(next) {
    if(!this.isNew) {
        await this.validateMapping()
    }
    next()
})

const projectDefault = [
    {
        $project: {
            _id: 1,
            name: 1,
            description: 1,
            hasRelatedData: 1,
            createdBy: getFullName('$createdBy'),
            _status: 1
        }
    }
]

const lookups = [
    ...lookupUnwind({
        from: 'users',
        localField: 'createdBy'
    })
]

const checkRelationships = [
    ...validateTableRelationship('users', 'department', false, 'hasRelatedUser'),
    ...validateTableRelationship('projects', 'departments', true, 'hasRelatedProject'),
    {
        $addFields: {
            hasRelatedData: {
                $cond: {
                    if: {
                        $or: [
                            '$hasRelatedUser',
                            '$hasRelatedProject'
                        ]
                    },
                    then: true,
                    else: false
                }
            }
        }
    }
]

schema.statics.dataView = {
    default: (session, query) => {
        const { hasRelatedData } = query
        const matchObj = []

        if (hasRelatedData === 'true' || hasRelatedData === 'false') {
            matchObj.push({
                $match: {
                    hasRelatedData: hasRelatedData === 'true'
                }
            })
        }

        return [
            ...aggregationHelper.to12HourString({
                fieldName: 'dateCreated'
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'dateUpdated'
            }),
            matchNotDeleted(),
            ...lookups,
            ...checkRelationships,
            ...projectDefault,
            ...matchObj
        ]
    },
    table: [
        ...aggregationHelper.to12HourString({
            fieldName: 'dateCreated'
        }),
        ...aggregationHelper.to12HourString({
            fieldName: 'dateUpdated'
        }),
        matchNotDeleted(),
        ...lookups,
        ...checkRelationships,
        {
            $project: {
                _id: 1,
                name: 1,
                hasRelatedData: 1,
                createdBy: getFullName('$createdBy'),
                _status: 1
            }
        }
    ]
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [
            'name',
            'createdBy'
        ]

        return generateSearch(search, searchAttributes)
    }
}
schema.plugin(autopopulate)
const modifiedSchema = schemaFactory(schema)

const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'Department'
})

module.exports = model