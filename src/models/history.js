/***
 * File name: history.js
 *
 * Description:
 * Schema for Item Type model to map the data that will be stored in the database.
 *
 * - Creates a schema for Item Type model that serves as a structure for all
 *   documents inside of Item Type collection in the database. For more
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
 * - model: The Item Type model with statics and configurations.
 */

/* eslint-disable require-await */
// Rule is needed to be disabled for Mongoose
/* eslint-disable no-invalid-this */
// Rule is needed to be disabled for the ObjectId to be parsed correctly
/* eslint-disable new-cap */
const { Schema, Types } = require('mongoose')
const { schemaFactory, modelFactory } = require('mongodb-plugin')
const { ObjectId } = Types
const { generateSearch } = require('./lib/utils')
const {
    padDates = true,
    padTimes = true
} = require('../config/meta')
const aggregationHelper = require('../lib/aggregationHelpers')({
    padDates,
    padTimes
})
const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose)

const schema = new Schema(
    {
        model: {
            type: String,
            enum: [
                'project',
                'finance'
            ],
            required: [
                true,
                'Model is required.'
            ]
        },
        modelId: {
            type: ObjectId,
            required: [
                true,
                'Model id is required.'
            ]
        },
        name: {
            type: String,
            required: [
                true,
                'Name is required.'
            ]
        },
        activities: {
            type: String
        },
        previous: {
            type: String,
            default: null
        },
        updated: {
            type: String,
            default: null
        },
        userId: {
            type: ObjectId,
            ref: 'User'
        },
        userFullName: {
            type: String
        },
        dateCreated: {
            type: Date,
            default: Date.now
        },

        // this is auto-incremented
        id: {
            type: Number,
            unique: true
        }
    },
    {
        autoCreate: true,
        collation: {
            locale: 'en_US',
            strength: 1
        }
    }
)

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
        {
            $project: {
                __v: 0,
                _status: 0
            }
        }
    ]
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [
            'userFullName',
            'dateCreated',
            'activities',
            'previous',
            'updated'
        ]

        return generateSearch(search, searchAttributes)
    }
}

schema.plugin(
    AutoIncrement,
    {
        id: 'history_seq',
        // eslint-disable-next-line camelcase
        inc_field: 'id'
    }
)
const modifiedSchema = schemaFactory(schema)

const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'History'
})

module.exports = model