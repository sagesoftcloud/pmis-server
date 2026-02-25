/***
 * File name: ipimBillingInformation.js
 *
 * Description:
 * Schema for IPIM Billing Information model to map the data that will be stored in the database.
 *
 * - Creates a schema for IPIM Billing Information model that serves as a structure for all
 *   documents inside of IPIM Billing Information collection in the database. For more
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
 * - model: The IPIM Billing Information model with statics and configurations.
 */

// Rule is needed to be disabled for Mongoose
/* eslint-disable no-invalid-this */

const { Schema, Types, connection } = require('mongoose')
const { ObjectId } = Types
const { schemaFactory, modelFactory } = require('mongodb-plugin')

const {
    padDates = true,
    padTimes = true
} = require('../config/meta')
const { generateSearch } = require('./lib/utils')
const aggregationHelper = require('../lib/aggregationHelpers')({
    padDates,
    padTimes
})

const schema = new Schema(
    {
        projectId: {
            type: ObjectId,
            required: [
                true,
                "Project id is required."
            ],
            ref: 'Project'
        },

        checkOrReferenceNumber: {
            type: String,
            required: [
                true,
                'Check No./Reference No. is required.'
            ]
        },

        billingNumber: {
            type: Number,
            required: [
                true,
                'Billing Number is required.'
            ]
        },

        dateOfBilling: {
            type: Date
        },

        datePaid: {
            type: Date
        },

        grossAmount: {
            type: Number
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

        amountOfLD: {
            type: Number
        },

        reasonForDelays: {
            type: String
        },

        retention: {
            type: Number
        },

        netAmountPaid: {
            type: Number
        },

        otherDeductions: {
            type: Number
        },

        cumulativeAccomplishment: {
            type: Number,
            validate: {
                validator: function(v) {
                    return v >= 0 && v <= 100
                },
                message: (props) => `${props.value} is not a valid cumulative accomplishment!`
            }
        },

        accomplishment: {
            type: String
        },

        remarks: {
            type: String
        },

        DVNumber: {
            type: String
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

schema.methods.validateProject = async function () {
    const { Project } = connection.models
    const project = await Project.findById(this.projectId)

    if (project.status === 'Completed') {
        throw new Error('Project is Completed.')
    }

    else if (project.status === 'Terminated') {
        throw new Error('Project is Terminated.')
    }
}


schema.pre('save', async function (next) {
    await this.validateProject()

    next()
})

schema.statics.dataView = {
    default: [
        {
            $match: {
                _status: 'active'
            }
        },
        ...aggregationHelper.to12HourString({
            fieldName: 'dateCreated',
            includeTime: false
        }),
        ...aggregationHelper.to12HourString({
            fieldName: 'dateUpdated',
            includeTime: false
        }),
        ...aggregationHelper.to12HourString({
            fieldName: 'dateOfBilling',
            includeTime: false
        }),
        ...aggregationHelper.to12HourString({
            fieldName: 'datePaid',
            includeTime: false
        }),
        {
            $addFields: {
                grossAmount: {
                    $round: [
                        "$grossAmount",
                        2 
                    ]
                }
            }
        },
        {
            $project: {
                __v: 0
            }
        }
    ]
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [
            'billingNumber',
            'dateOfBilling',
            'datePaid',
            'checkOrReferenceNumber',
            'grossAmount',
            'amountOfLD',
            'reasonForDelays',
            'retention',
            'netAmountPaid',
            'cumulativeAccomplishment',
            'accomplishment',
            'remarks',
            'dateCreated'
        ]

        return generateSearch(search, searchAttributes)
    }
}

const modifiedSchema = schemaFactory(schema)

schema.index(modifiedSchema.index({
    projectId: 1,
    checkOrReferenceNumber: 1,
    billingNumber: 1
}, {
    unique: true
}))

const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'IPIMBillingInformation'
})

module.exports = model