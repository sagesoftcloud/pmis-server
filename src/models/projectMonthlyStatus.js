/***
 * File name: projectMonthlyStatus.js
 *
 * Description:
 * Schema for Project Monthly Status model to map the data that will be stored in the database.
 *
 * - Creates a schema for Project Monthly Status model that serves as a structure for all
 *   documents inside of Project Monthly Status collection in the database. For more
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
 * - model: The Project Monthly Status model with statics and configurations.
 */

// Rule is needed to be disabled for Mongoose
/* eslint-disable no-invalid-this */

const { Schema, Types, connection } = require('mongoose')
const { schemaFactory, modelFactory } = require('mongodb-plugin')
const { ObjectId } = Types

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
                'Project id is required.'
            ],
            ref: 'Project'
        },

        reportingMonth: {
            type: String,
            required: [
                true,
                'Reporting Month is required.'
            ]
        },

        month: {
            type: Number
        },
        year: {
            type: Number
        },

        revision: {
            type: Number,
            required: [
                true,
                'Revision is required.'
            ]
        },

        revisedContractAmount: {
            type: Number
        },

        revisedContractDuration: {
            type: Number
        },

        revisedTargetCompletionDate: {
            type: Date
        },

        variationOrder: {
            type: Number
        },

        numberOfExtensionDays: {
            type: Number
        },
        extensionBasis: {
            type: String
        },

        suspensionTime: {
            type: Number
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
            fieldName: 'revisedTargetCompletionDate',
            includeTime: false
        })
    ]
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [
            'reportingMonth',
            'cumulativePlanned',
            'cumulativeActual',
            'variance',
            'revision',
            'revisedContractAmount',
            'revisedContractDuration',
            'revisedTargetCompletionDate',
            'variationOrder',
            'numberOfExtensionDays',
            'extensionBasis',
            'daysSuspended',
            'problems',
            'remarks'
        ]

        return generateSearch(search, searchAttributes)
    }
}

const modifiedSchema = schemaFactory(schema)

schema.index(modifiedSchema.index({
    projectId: 1,
    reportingMonth: 1
}, {
    unique: true
}))

const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'ProjectMonthlyStatus'
})

module.exports = model