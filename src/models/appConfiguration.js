/***
 * File name: appConfiguration.js
 *
 * Description:
 * Schema for Project model to map the data that will be stored in the database.
 *
 * - Creates a schema for Project model that serves as a structure for all
 *   documents inside of Project collection in the database. For more
 *   information about schema check https://mongoosejs.com/docs/guide.html.
 * - Creates data view. For more information about statics
 *   check https://mongoosejs.com/docs/guide.html#statics.
 *   - Data view is used to create aggregation pipelines for
 *     processing data.
 *
 * Module Exports:
 * - model: The Project model with statics and configurations.
 */

/* eslint-disable require-await */
const mongoose = require('mongoose')
const { Schema } = mongoose

const { schemaFactory, modelFactory } = require('mongodb-plugin')

const schema = new Schema({
    deactivationReasons: {
        type: [ String ],
        default: []
    }
})

schema.statics.dataView = {
    default: async function () {
        return [
            {
                $project: {
                    deactivationReasons: 1
                }
            }
        ]
    }
}

const modifiedSchema = schemaFactory(schema)
const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'AppConfiguration'
})

module.exports = model