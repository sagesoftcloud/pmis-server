/* eslint-disable no-undefined */
/* eslint-disable no-extra-parens */
/***
 * File name: finance.js
 *
 * Description:
 * Schema for Finance model to map the data that will be stored in the database.
 *
 * - Creates a schema for Finance model that serves as a structure for all
 *   documents inside of Finance collection in the database. For more
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
 * - model: The Finance model with statics and configurations.
 */

/* eslint-disable require-await */
// Rule is needed to be disabled for Mongoose
/* eslint-disable no-invalid-this */
// Rule is needed to be disabled for the ObjectId to be parsed correctly
/* eslint-disable new-cap */
const { Schema, Types } = require('mongoose')
const { schemaFactory, modelFactory } = require('mongodb-plugin')
const { ObjectId } = Types

const autopopulate = require('mongoose-autopopulate')

const {
    padDates = true,
    padTimes = true,
    maxFileUploadSize,
    timezone,
    FOR_BUDGET,
    FOR_ACCOUNTING,
    FOR_CASHIER,
    COMPLETED,
    HARD_DELETE
} = require('../config/meta')
const aggregationHelper = require('../lib/aggregationHelpers')({
    padDates,
    padTimes
})

const attachment = require('../schema/attachment')

const {
    generateSearch,
    lookupUnwind,
    matchNotDeleted,
    handleUploadedBy
} = require('./lib/utils')
const { unlinkFileFromFilePath } = require('../lib/utils')

const schema = new Schema(
    {
        projectId: {
            type: ObjectId,
            ref: 'Project',
            required: [
                true,
                'Project id is required.'
            ],
            unique: true,
            immutable: true
        },
        status: {
            type: String,
            enum: [
                FOR_BUDGET,
                FOR_ACCOUNTING,
                FOR_CASHIER,
                COMPLETED
            ]
        },

        // For Budget
        approvedProposedBudget: {
            type: Number
        },

        obligatedItem: {
            type: [
                {
                    items: {
                        type: [
                            {
                                name: {
                                    type: String,
                                    required: [
                                        true,
                                        'Item Name is required.'
                                    ]
                                },
                                quantity: {
                                    type: Number,
                                    required: [
                                        true,
                                        'Quantity is required'
                                    ]
                                },
                                unit: {
                                    type: String,
                                    maxLength: 36
                                },
                                supplier: {
                                    type: String
                                },
                                obligationDate: {
                                    type: Date
                                },
                                ORNumber: {
                                    type: String
                                },
                                obligatedAmount: {
                                    type: Number,
                                    required: [
                                        true,
                                        'Obligated amount is required'
                                    ]
                                },
                                particulars: {
                                    type: String
                                },
                                payee: {
                                    type: String
                                },
                                total: {
                                    type: Number
                                },

                                // For Accounting
                                actualDisbursement: {
                                    type: Number
                                },
                                unpaidObligation: {
                                    type: Number
                                },
                                DVNumber: {
                                    type: String
                                },
                                gross: {
                                    type: Number
                                },
                                isTaxable: {
                                    type: Boolean
                                },
                                taxPercentageLabel: {
                                    type: String
                                },
                                taxPercentage: {
                                    type: Number
                                },
                                taxAmount: {
                                    type: Number
                                },
                                taxableAmount: {
                                    type: Number
                                },
                                LDOtherDeduction: {
                                    type: Number
                                },
                                netAmount: {
                                    type: Number
                                },
                                isVatable: {
                                    type: Boolean,
                                    default: false
                                },
                                vatAmount: {
                                    type: Number,
                                    default: 0
                                },
                                ewt: {
                                    type: Number,
                                    default: 0
                                },
                                cvat: {
                                    type: Number,
                                    default: 0
                                },
                                pcv: {
                                    type: Number,
                                    default: 0
                                },
                                pcvTaxPercentage: {
                                    type: Number,
                                    default: 0
                                },

                                // For Cashier
                                checkOrADANumber: {
                                    type: String
                                },
                                date: {
                                    type: Date
                                }
                            }
                        ]
                    },
                    itemType: {
                        type: String,
                        required: [
                            true,
                            'Item type is required'
                        ]
                    },
                    subTotal: {
                        type: Number
                    }
                }
            ],
            default: []
        },

        obligatedAmount: {
            type: Number
        },
        remainingBudget: {
            type: Number
        },

        documents: [ attachment ],
        createdBy: {
            type: ObjectId,
            ref: 'User',
            immutable: true
        },
        restoredAt: {
            type: Date,
            default: null
        }
    },
    {
        autoCreate: true,
        timestamps: {
            createdAt: 'dateCreated',
            updatedAt: 'dateUpdated'
        }
    }
)

schema.statics.hardDelete = HARD_DELETE.FINANCE

schema.methods.deleteDocuments = async function () {
    if (this.documents && this.documents.length) {
        for await(const document of this.documents) {
            if (document) {
                await unlinkFileFromFilePath(document, (err) => {
                    if (err) {
                        throw new Error(err)
                    }
                })
            }
        }
    }
}

const lookupLIB = [
    {
        $lookup: {
            from: "lineitembudgets",
            localField: "project._id",
            foreignField: "project",
            as: "lineItemBudget"
        }
    },
    {
        $unwind: {
            path: "$lineItemBudget",
            preserveNullAndEmptyArrays: true
        }
    }
]

const lookupActualExpenses = [
    {
        $lookup: {
            from: "actualexpenses",
            localField: "project._id",
            foreignField: "project",
            as: "actualExpenses"
        }
    },
    {
        $unwind: {
            path: "$actualExpenses",
            preserveNullAndEmptyArrays: true
        }
    }
]

const lookups = [
    ...lookupUnwind({
        from: 'projects',
        localField: 'projectId',
        as: 'project'
    }),
    ...lookupUnwind({
        from: 'projecttypes',
        localField: 'project.projectType',
        as: 'projectType'
    }),
    ...lookupUnwind({
        from: 'campus',
        localField: 'project.campus',
        as: 'campus'
    }),
    ...lookupLIB,
    ...lookupActualExpenses
]

const projectDefault = [
    {
        $project: {
            __v: 0
        }
    },
    ...handleUploadedBy('documents'),
    {
        $project: {
            _id: 1,
            status: 1,
            projectId: '$project._id',
            projectName: '$project.title',
            projectType: '$projectType.name',
            projectStatus: '$project.status',
            lineItemBudget: '$lineItemBudget.budgets',
            actualExpenses: '$actualExpenses.expenses',
            approvedProposedBudget: 1,
            obligatedItem: 1,
            obligatedAmount: 1,
            remainingBudget: 1,
            campus: '$campus.name',
            _status: 1,
            documents: {
                $map: {
                    input: '$documents',
                    as: 'document',
                    in: {
                        _id: '$$document._id',
                        documentId: '$_id',
                        fieldname: '$$document.fieldname',
                        originalname: '$$document.originalname',
                        encoding: '$$document.encoding',
                        mimetype: '$$document.mimetype',
                        destination: '$$document.destination',
                        filename: '$$document.filename',
                        path: '$$document.path',
                        size: '$$document.size',
                        uploadDate: {
                            $dateToString: {
                                date: '$$document.uploadDate',
                                timezone,
                                format: '%Y-%m-%d %H:%M:%S',
                                onNull: '$$REMOVE'
                            }
                        },
                        uploadedBy: '$$document.uploadedBy',
                        fullName: '$$document.fullName',
                        userId: '$$document.userId',
                        project: '$project'
                    }
                }
            }
        }
    }
]

schema.statics.dataView = {
    default: async function () {
        return [
            ...aggregationHelper.to12HourString({
                fieldName: 'dateCreated',
                includeTime: false
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'dateUpdated',
                includeTime: false
            }),
            ...lookups,
            ...projectDefault
        ]
    },
    documents: [
        ...handleUploadedBy('documents'),
        {
            $project: {
                documents: {
                    $map: {
                        input: '$documents',
                        as: 'document',
                        in: {
                            _id: '$$document._id',
                            documentId: '$_id',
                            fieldname: '$$document.fieldname',
                            originalname: '$$document.originalname',
                            encoding: '$$document.encoding',
                            mimetype: '$$document.mimetype',
                            destination: '$$document.destination',
                            filename: '$$document.filename',
                            path: '$$document.path',
                            size: '$$document.size',
                            uploadDate: {
                                $dateToString: {
                                    date: '$$document.uploadDate',
                                    timezone,
                                    format: '%Y-%m-%d %H:%M:%S',
                                    onNull: '$$REMOVE'
                                }
                            },
                            uploadedBy: '$$document.uploadedBy',
                            fullName: '$$document.fullName',
                            userId: '$$document.userId',
                            project: '$project'
                        }
                    }
                }
            }
        },
        {
            $unwind: '$documents'
        },
        {
            $replaceRoot: {
                newRoot: '$documents'
            }
        }
    ],
    table: function (session, query) {
        const {
            campus,
            status
        } = query

        const filter = []

        if (campus) {
            filter.push({
                $match: {
                    campus: campus
                }
            })
        }

        if (status) {
            filter.push({
                $match: {
                    status: status
                }
            })
        }

        return [
            matchNotDeleted(),
            ...lookupUnwind({
                from: 'projects',
                foreignField: '_id',
                localField: 'projectId',
                as: 'project'
            }),
            ...lookupUnwind({
                from: 'campus',
                localField: 'project.campus',
                as: 'campus'
            }),
            {
                $project: {
                    projectName: '$project.title',
                    status: 1,
                    campus: '$campus.name',
                    dateCreated: {
                        $dateToString: {
                            date: '$dateCreated',
                            timezone,
                            format: '%Y-%m-%d',
                            onNull: '$$REMOVE'
                        }
                    },
                    _status: 1
                }
            },
            ...filter
        ]
    },
    archiveTable: function (session, query) {
        const {
            campus,
            status
        } = query

        const filter = []

        if (campus) {
            filter.push({
                $match: {
                    campus: campus
                }
            })
        }

        if (status) {
            filter.push({
                $match: {
                    status: status
                }
            })
        }

        return [
            {
                $match: {
                    _status: 'deleted'
                }
            },
            ...lookupUnwind({
                from: 'projects',
                foreignField: '_id',
                localField: 'projectId',
                as: 'project'
            }),
            ...lookupUnwind({
                from: 'campus',
                localField: 'project.campus',
                as: 'campus'
            }),
            {
                $project: {
                    projectName: '$project.title',
                    status: 1,
                    campus: '$campus.name',
                    dateCreated: {
                        $dateToString: {
                            date: '$dateCreated',
                            timezone,
                            format: '%Y-%m-%d',
                            onNull: '$$REMOVE'
                        }
                    },
                    _status: 1
                }
            },
            ...filter
        ]
    }
}

schema.statics.upload = {
    documents: {
        dest: 'files',
        folder: 'document',
        mimeTypes: [
            "image/jpeg",
            "image/png",
            "application/pdf",
            "application/vnd.ms-excel",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        maxCount: 50,
        maxFileUploadSize
    }
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [
            'projectName',
            'createdBy.name',
            'dateCreated'
        ]

        return generateSearch(search, searchAttributes)
    },
    documents: function (search) {
        const searchAttributes = [
            'fullName',
            'originalname',
            'project.title',
            'uploadDate'
        ]

        return generateSearch(search, searchAttributes)
    },
    table: function (search) {
        const searchAttributes = [
            'projectName',
            'status',
            'campus'
        ]

        return generateSearch(search, searchAttributes)
    }
}

schema.plugin(autopopulate)
const modifiedSchema = schemaFactory(schema)
const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'Finance'
})
module.exports = model