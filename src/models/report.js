// Rule is needed to be disabled for Mongoose
/* eslint-disable no-invalid-this */
// Rule is needed to be disabled for the ObjectId to be parsed correctly
/* eslint-disable new-cap */
const mongoose = require('mongoose')
const { Schema } = mongoose
const moment = require('moment')

const { schemaFactory, modelFactory } = require('mongodb-plugin')

const schema = new Schema({
    name: {
        type: "String",
        required: true
    },
    dateGenerated: {
        type: "Date",
        default: moment().format()
    },
    author: {
        type: "ObjectId",
        ref: 'User',
        required: true
    },
    parameters: {
        type: "Map"
    }
})

schema.statics.modifyInfo = function (parameters) {
    const start = moment(parameters.dateFrom, [
        "MM/DD/YYYY",
        "MM-DD-YYYY",
        "DD/MM/YYYY",
        "DD-MM-YYYY",
        "YYYY-MM-DD",
        "YYYY/MM/DD"
    ]).startOf('day')
        .toDate()
    const end = parameters.dateTo ? moment(parameters.dateTo, [
        "MM/DD/YYYY",
        "MM-DD-YYYY",
        "DD/MM/YYYY",
        "DD-MM-YYYY",
        "YYYY-MM-DD",
        "YYYY/MM/DD"
    ]).endOf('day')
        .toDate() : moment(start).endOf('day')
        .toDate()

    return {
        ...parameters,
        dateFrom: start,
        dateTo: end
    }
}

const modifiedSchema = schemaFactory(schema)
const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'Report'
})


module.exports = model