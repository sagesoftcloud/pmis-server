/***
 * File name: projectType.js
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
 * - model: The Project Task model with statics and configurations.
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
    generateSearch,
    getFullName,
    lookupUnwind,
    validateTableRelationship,
    matchNotDeleted
} = require('./lib/utils')

const autopopulate = require('mongoose-autopopulate')

const schema = new Schema(
    {
        name: {
            type: String,
            required: [
                true,
                'Project Type Name is required.'
            ],
            unique: true
        },
        description: {
            type: String
        },
        createdBy: {
            type: ObjectId,
            ref: 'User'
        },
        isBOQ: {
            type: Boolean,
            default: function () {
                return this.name === "Infrastructure/Construction Project"
            }
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

schema.statics.hardDelete = HARD_DELETE.PROJECT_TYPE

schema.methods.validateMapping = async function () {
    if(this.isModified('name') || this.isModified('description')) {
        const mappedProjectType = await this.constructor.aggregate([
            {
                $match: {
                    _status: {
                        $ne: 'deleted'
                    },
                    _id: this._id
                }
            },
            ...validateTableRelationship('projects', 'projectType'),
            {
                $match: {
                    hasRelatedData: true
                }
            }
        ])

        if(mappedProjectType.length) {
            throw new Error('Project Type is currently mapped to other document(s).')
        }
    }
}

schema.pre('save', async function(next) {
    if(!this.isNew) {
        await this.validateMapping()
    }
    next()
})

schema.statics.dataView = {
    default: [
        ...aggregationHelper.to12HourString({
            fieldName: 'dateCreated'
        }),
        ...aggregationHelper.to12HourString({
            fieldName: 'dateUpdated'
        }),
        matchNotDeleted(),
        ...lookupUnwind({
            from: 'users',
            localField: 'createdBy'
        }),
        ...validateTableRelationship('projects', 'projectType'),
        {
            $project: {
                __v: 0
            }
        },
        {
            $addFields: {
                createdBy: getFullName('$createdBy')
            }
        }
    ],
    table: [
        ...aggregationHelper.to12HourString({
            fieldName: 'dateCreated'
        }),
        ...aggregationHelper.to12HourString({
            fieldName: 'dateUpdated'
        }),
        matchNotDeleted(),
        ...lookupUnwind({
            from: 'users',
            localField: 'createdBy'
        }),
        ...validateTableRelationship('projects', 'projectType'),
        {
            $project: {
                _id: 1,
                name: 1,
                createdBy: 1,
                hasRelatedData: 1,
                _status: 1
            }
        },
        {
            $addFields: {
                createdBy: getFullName('$createdBy')
            }
        }
    ]
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [
            'name',
            'createdBy',
            'description'
        ]

        return generateSearch(search, searchAttributes)
    },
    table: function (search) {
        const searchAttributes = [
            'name',
            'createdBy',
            'description'
        ]

        return generateSearch(search, searchAttributes)
    }
}
schema.plugin(autopopulate)
const modifiedSchema = schemaFactory(schema)

const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'ProjectType'
})

module.exports = model