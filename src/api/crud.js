/***
 * File name: crudService.js
 *
 * Description:
 * This file includes the HTTP request paths that are used for
 * creating, reading all, reading specific, updating, and deleting
 * master data elements.
 *
 * Module Exports:
 * - function: Returns an Express router witn included HTTP request paths for
 * creating, reading all, reading specific, updating, and deleting
 * master data elements
 */

const models = require('../models')
const excludedCollections = [
    "report",
    "index",
    'history',
    'ipimMonthlyReport',
    'ipimBillingInformation',
    'projectMonthlyStatus',
    'finance'
]
const collections = Object.keys(models).filter((collection) => !excludedCollections.includes(collection))
const { canSoftDelete } = require('../config')
const { authorize } = require('../config/auth')
const { canDeleteDocument } = require('../middlewares/app')
const crud = require('../controllers/crud')
const years = require('../services/years')
const archivedYears = require('../services/archivedYears')


module.exports = (router) => {
    collections.forEach((collection) => {
        const crudController = crud(models, {
            canSoftDelete
        }, collection)

        router.route(`/${collection}`)
            .post(
                authorize,
                crudController.create
            )
            .get(
                authorize,
                crudController.viewAll
            )
        router.route(`/${collection}/:_id`)
            .patch(
                authorize,
                crudController.update
            )
            .get(
                authorize,
                crudController.view
            )
            .delete(
                authorize,
                canDeleteDocument(collection),
                crudController.delete
            )
        router.route(`/${collection}/:_id/activate`)
            .patch(
                authorize,
                crudController.activate
            )
        router.route(`/${collection}/years/active`)
            .get(
                authorize,
                years(collection)
            )
        router.route(`/${collection}/years/archived`)
            .get(
                authorize,
                archivedYears(collection)
            )
        router.route(`/${collection}/multiple/delete`)
            .post(
                authorize,
                canDeleteDocument(collection),
                crudController.deleteMany
            )
        router.route(`/${collection}/multiple/activate`)
            .post(
                authorize,
                canDeleteDocument(collection),
                crudController.activateMany
            )
    })
}