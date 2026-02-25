/* eslint-disable no-undefined */
/***
 * File name: crudService.js
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
const { errorMessage } = require('../lib/utils')
const Crud = require('../services/crud')

module.exports = (models, settings, _model) => {
    const crudService = new Crud(models, settings, _model)

    return {
        create: async (req, res, next) => {
            try {
                const { ...info } = req.body
                let { user } = req.session
                user = user ? user : req.user

                const data = await crudService.create({
                    info,
                    user
                })

                res.status(201).json(data)
            }

            catch(error) {
                next(new RequestError(400, errorMessage(error)))
            }
        },
        view: async (req, res, next) => {
            try {
                const { _id } = req.params
                const { session, query } = req
                const { dataview = 'default' } = req.query

                const entry = await crudService.view({
                    _id,
                    session,
                    query,
                    dataview
                })

                res.status(200).json(entry)
            }
            catch(error) {
                next(new RequestError(400, errorMessage(error)))
            }
        },
        viewAll: async (req, res, next) => {
            try {
                const { query, session } = req

                const entries = await crudService.viewAll({
                    query,
                    session
                })

                res.status(200).json(entries)
            }
            catch(error) {
                next(new RequestError(400, errorMessage(error)))
            }
        },
        update: async (req, res, next) => {
            try {
                const { _id } = req.params
                const { ...updateInfo } = req.body

                let { user } = req.session
                user = user ? user : req.user

                const data = await crudService.update({
                    _id,
                    updateInfo,
                    user
                })

                res.status(200).json(data)
            }
            catch(error) {
                next(new RequestError(400, errorMessage(error)))
            }
        },
        delete: async (req, res, next) => {
            try {
                const { _id } = req.params
                let { user } = req.session
                user = user ? user : req.user

                const data = await crudService.delete({
                    _id,
                    user,
                    canSoftDelete: settings.canSoftDelete
                })

                res.status(200).json(data)
            }
            catch(error) {
                next(new RequestError(400, errorMessage(error)))
            }
        },
        deleteMany: async (req, res, next) => {
            try {
                const { ids } = req.body
                let { user } = req.session
                user = user ? user : req.user

                const data = await crudService.deleteMany({
                    ids,
                    user,
                    canSoftDelete: settings.canSoftDelete
                })

                res.status(200).json(data)
            }
            catch(error) {
                next(new RequestError(400, errorMessage(error, _model), {
                    errors: error.errors,
                    successes: error.successes
                }))
            }
        },
        activate: async (req, res, next) => {
            try {
                const { _id } = req.params
                let { user } = req.session
                user = user ? user : req.user

                const data = await crudService.operate({
                    _id,
                    _operation: 'activate',
                    user
                })

                res.status(200).json(data)
            }
            catch(error) {
                next(new RequestError(400, errorMessage(error)))
            }
        },
        activateMany: async (req, res, next) => {
            try {
                const { ids } = req.body
                let { user } = req.session
                user = user ? user : req.user

                const data = await crudService.operateMany({
                    ids,
                    _operation: 'activate',
                    user
                })

                res.status(200).json(data)
            }
            catch(error) {
                next(new RequestError(400, errorMessage(error)))
            }
        }
    }
}