/* eslint-disable no-undefined */
/***
 * File name: crud.js
 *
 * Description:
 * This file includes the middleware and logic that are used for
 * creating, reading all, reading specific, updating, operating
 * and deleting master data elements.
 *
 * These include utility functions that are used to format error
 * messages which are displayed upon utilization of the REST API route.
 *
 * Module Exports:
 * - object: Returns an object of key-function pairs which define how to
 * creating, reading all, reading specific, updating, updating status,
 * deleting one, and deleting many master data elements.
 */


/* eslint-disable no-nested-ternary */
/* eslint-disable new-cap */
const { RequestError } = require('error-handler')
const { sentenceCase, modelExists, formatQuery, handleUniqueConstraints } = require('../lib/utils')
const { Types } = require('mongoose')
const { ObjectId } = Types

module.exports = class Crud {
    constructor(models, settings, _model) {
        this.models = models
        this.settings = settings
        this._model = _model
    }

    async create ({ info, user }) {
        const model = modelExists(this.models, this._model)

        const createdByDoc = await this.models.user.findById(user)

        await handleUniqueConstraints(model, info)

        const defaultInfo = {
            createdBy: ObjectId(createdByDoc._id),
            updatedBy: ObjectId(createdByDoc._id),
            _revision: {
                author: {
                    userModel: this.models.user.constructor.modelName,
                    doc: ObjectId(createdByDoc._id)
                },
                description: `Created a document for ${sentenceCase(this._model)} by ${createdByDoc.firstName} ${createdByDoc.middleName ? `${createdByDoc.middleName}` : ''} ${createdByDoc.lastName}.`
            }
        }

        const entry = await model.create({
            ...info,
            ...defaultInfo
        })

        if (!entry) {
            throw new Error(`Error in creating ${sentenceCase(this._model)}.`)
        }

        entry._revision = undefined
        entry.__v = undefined
        entry.dateCreated = undefined
        entry.dateUpdated = undefined

        return {
            message: `Created an entry for ${sentenceCase(this._model)}.`,
            entry
        }
    }

    async view ({ _id, session, query, dataview }) {
        const model = modelExists(this.models, this._model)
        if(!model.dataView[`${dataview}`]) {
            throw new Error(`Data view is not defined in the ${sentenceCase(this._model)} model.`)
        }

        let dataViewQuery = model.dataView[`${dataview}`] || []
        if (typeof model.dataView[`${dataview}`] === 'function') {
            dataViewQuery = await model.dataView[`${dataview}`](session, query)
        }

        const entry = await model.aggregate([
            {
                $match: {
                    _id: ObjectId(_id)
                }
            },
            {
                $project: {
                    _revision: 0
                }
            },
            ...dataViewQuery
        ]).allowDiskUse(true)

        if(entry.length === 0) {
            throw new Error(`${sentenceCase(this._model)} is not found.`)
        }

        return {
            entry: entry[0]
        }
    }

    async viewAll ({ query, session }) {
        const model = modelExists(this.models, this._model)

        let customQuery = {
        }
        let pipeline = []

        const {
            key = null,
            value = null,
            advancedQuery,
            start = 0,
            count = 999999,
            sortBy = '_id',
            secondSortBy = '_id',
            asc = 1,
            total = false,
            dataview = 'default',
            search
        } = query

        if(!model.dataView[`${dataview}`]) {
            throw new Error(`Data view is not defined in the ${sentenceCase(this._model)} model.`)
        }

        let dataViewQuery = model.dataView[`${dataview}`] || []
        if (typeof model.dataView[`${dataview}`] === 'function') {
            dataViewQuery = await model.dataView[`${dataview}`](session, query)
        }

        if(key !== null && value !== null) {
            customQuery = {
                [key]: value
            }
        }
        else if(advancedQuery) {
            customQuery = formatQuery(JSON
                .parse(decodeURIComponent(advancedQuery)))
        }
        pipeline = pipeline
            .concat([
                ...dataViewQuery,
                {
                    $match: customQuery
                }
            ])

        if (search) {
            const defaultSearch = model.search ? model.search[`${dataview}`](search) : []
            pipeline = pipeline.concat([ ...defaultSearch ])
        }

        const entries = await model.aggregate([
            ...pipeline,
            {
                $project: {
                    _revision: 0
                }
            },
            {
                $sort: {
                    [sortBy]: parseInt(asc, 10) === 1 ? 1 : -1,
                    [secondSortBy]: 1
                }
            },
            {
                $skip: parseInt(start, 10)
            },
            {
                $limit: parseInt(count, 10)
            }

        ]).allowDiskUse(true)
        const allEntries = await model.aggregate(pipeline)
        // Need to disable line to assign Mongoose data to variable
        // eslint-disable-next-line prefer-destructuring

        return total
            ? {
                total: allEntries.length
            }
            : {
                entries,
                total: allEntries.length
            }
    }

    async update ({ _id, updateInfo, user }) {
        const model = modelExists(this.models, this._model)
        const result = await model.findById(_id)

        if (!result) {
            throw new Error(`${sentenceCase(this._model)} is not found.`)
        }

        if (result._status === 'deleted') {
            throw new Error(`Cannot update deleted documents.`)
        }

        const updatedResult = Object.assign(result, {
            ...updateInfo
        })

        updatedResult._revision = {
            author: {
                userModel: this.models.user.constructor.modelName,
                doc: ObjectId(user)
            },
            description: `Modified ${sentenceCase(this._model)} document.`
        }

        await updatedResult.save()

        return {
            message: 'Record has been successfully updated.',
            updatedResult
        }
    }

    async delete ({ _id, user }) {
        const model = modelExists(this.models, this._model)
        const data = await model.findById(_id)
        const { canSoftDelete } = this.settings

        if (!data) {
            throw new Error(`${sentenceCase(this._model)} is not found.`)
        }

        if(data._status === 'inactive') {
            throw new Error(`Cannot delete inactive documents.`)
        }

        if(canSoftDelete && !model.hardDelete) {
            if(data._status === 'deleted') {
                throw new Error(`${sentenceCase(this._model)} is already deleted.`)
            }

            data.statusUpdatedBy = user
            data._status = 'deleted'
            data._revision = {
                author: {
                    userModel: this.models.user.constructor.modelName,
                    doc: ObjectId(user)
                },
                description: `Flagged this ${sentenceCase(this._model)} document as 'deleted'.`
            }

            await data.save({
                validateBeforeSave: false
            })

            return {
                message: `${sentenceCase(this._model)} has been deleted.`,
                softDeleteData: data
            }
        }

        data._revision = {
            author: {
                userModel: this.models.user.constructor.modelName,
                doc: ObjectId(user)
            },
            description: `Deleted ${sentenceCase(this._model)} document from the database.`
        }

        await data.save({
            validateBeforeSave: false
        })

        await data.remove()

        return {
            message: `${sentenceCase(this._model)} has been successfully deleted from the database.`,
            hardDeleteData: data
        }

    }

    async deleteMany ({ ids, user }) {
        const model = modelExists(this.models, this._model)

        if(!ids) {
            throw new Error('Please select a record to delete.')
        }

        if(!Array.isArray(ids)) {
            throw new Error(`'Delete many' only accepts an array.`)
        }

        if(ids.length === 0) {
            throw new Error('There are no records to delete.')
        }

        const documentsCount = await model.countDocuments({
            _id: {
                $in: ids
            }
        })

        if(documentsCount !== ids.length) {
            throw new Error(`Some record from ${sentenceCase(this._model)} selected is not found.`)
        }

        let messages = ids.map(async (_id) => {
            try {
                const result = await this.delete({
                    _id,
                    user
                })

                return {
                    message: result.message,
                    deleted: true
                }
            }
            catch(err) {
                return {
                    message: err.message,
                    deleted: false
                }
            }
        })

        messages = await Promise.all(messages)
        const errors = messages.filter((message) => message.deleted === false)
        const successes = messages.filter((message) => message.deleted === true)
        const errMessages = errors.map((error) => error.message)
        const successMessages = successes.map((error) => error.message)

        const deletedCount = documentsCount - errors.length

        let message = `${sentenceCase(this._model)}s have been successfully deleted from the database.`

        if(deletedCount < 2) {
            message = `${sentenceCase(this._model)} has been successfully deleted from the database.`
        }

        if(errors.length === 0) {
            return {
                entry: {
                    deletedCount,
                    message: message
                }
            }
        }

        throw new RequestError(400, errMessages.join(' '), {
            errors: errMessages,
            successes: successMessages
        })

    }

    async operate ({ _id, _operation, user }) {
        const model = modelExists(this.models, this._model)
        const result = await model.findById(_id)
        const oldStatus = result._status

        if (!result) {
            throw new Error(`${sentenceCase(this._model)} is not found.`)
        }

        let _status = ''
        if(_operation === 'activate') {
            if(result._status === 'active') {
                throw new Error(`${sentenceCase(this._model)} is already active.`)
            }
            _status = 'active'
        }
        else if(_operation === 'deactivate') {
            if(result._status === 'inactive') {
                throw new Error(`${sentenceCase(this._model)} is already inactive.`)
            }
            _status = 'inactive'
        }
        else if(_operation === 'delete') {
            if(result._status === 'deleted') {
                throw new Error(`${sentenceCase(this._model)} is already deleted.`)
            }
            _status = 'deleted'
        }
        else {
            throw new Error('Invalid operation.')
        }

        const updatedResult = Object.assign(result, {
            _status,
            statusUpdatedBy: user
        })

        let action = ''
        if (oldStatus === 'deleted' && _operation === 'activate') {
            action = 'Recovered'
        }

        else {
            action = 'Deactivated'
        }

        updatedResult._revision = {
            author: {
                userModel: this.models.user.constructor.modelName,
                doc: ObjectId(user)
            },
            description: `${action} document in ${sentenceCase(this._model)}.`
        }

        await updatedResult.save()

        return {
            message: `Record has been successfully ${_operation}d.`,
            updatedResult
        }
    }

    async operateMany ({ ids, _operation, user }) {
        const model = modelExists(this.models, this._model)

        if(!ids) {
            throw new Error(`Please select a record to ${_operation}.`)
        }

        if(!Array.isArray(ids)) {
            const operation = _operation.charAt(0).toUpperCase() + _operation.slice(1)
            throw new Error(`'${operation} many' only accepts an array.`)
        }

        if(ids.length === 0) {
            throw new Error(`There are no records to ${_operation}.`)
        }

        if (model.validateOperateMany) {
            await model.validateOperateMany(ids, _operation)
        }

        const documentsCount = await model.countDocuments({
            _id: {
                $in: ids
            }
        })

        if(documentsCount !== ids.length) {
            throw new Error(`Some record from ${sentenceCase(this._model)} selected is not found.`)
        }

        let messages = ids.map(async (_id) => {
            try {
                const result = await this.operate({
                    _id,
                    _operation,
                    user
                })

                return {
                    message: result.message,
                    operated: true
                }
            }
            catch(err) {
                return {
                    message: err.message,
                    operated: false
                }
            }
        })

        messages = await Promise.all(messages)
        const errors = messages.filter((message) => message.operated === false)
        const successes = messages.filter((message) => message.operated === true)
        const errMessages = errors.map((error) => error.message)
        const successMessages = successes.map((error) => error.message)

        const deletedCount = documentsCount - errors.length

        let message = `${sentenceCase(this._model)}s have been successfully ${_operation}d from the database.`

        if(deletedCount < 2) {
            message = `${sentenceCase(this._model)} has been successfully ${_operation}d from the database.`
        }

        if(errors.length === 0) {
            return {
                message
            }
        }

        throw new RequestError(400, errMessages.join(' '), {
            errors: errMessages,
            successes: successMessages
        })
    }
}