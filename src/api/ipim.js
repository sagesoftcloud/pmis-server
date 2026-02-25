/***
 * File name: ipimMonthlyReport.js
 *
 * Description:
 * This file includes the HTTP request paths that are used for
 * checking a working backend, and database and email connectivity.
 *
 * Module Exports:
 * - function: Returns an Express router witn included HTTP request paths for
 * fetching ipimMonthlyReport data.
 */

const { authorize } = require('../config/auth')
const ipimBillingInformation = require('../controllers/ipimBillingInformation')
const ipimMonthlyReport = require('../controllers/ipimMonthlyReport')
const models = require('../models')
const crud = require('../controllers/crud')
const { canSoftDelete } = require('../config')

module.exports = (router) => {
    router.route(`/ipim/monthlyReport/latest/:_projectId`)
        .get(
            authorize,
            ipimMonthlyReport.generate
        )
    router.route(`/ipim/monthlyReport/reports/:_projectId`)
        .get(
            authorize,
            ipimMonthlyReport.view
        )
    router.route('/ipim/monthlyReport')
        .post(
            authorize,
            crud(models, {
                canSoftDelete
            }, 'ipimMonthlyReport').create
        )
    router.route('/ipim/monthlyReport/:_id')
        .patch(
            authorize,
            crud(models, {
                canSoftDelete
            }, 'ipimMonthlyReport').update
        )
    router.route('/ipim/billingInformation')
        .post(
            authorize,
            ipimBillingInformation.create
        )
    router.route(`/ipim/billingInformation/:_projectId`)
        .get(
            authorize,
            ipimBillingInformation.view
        )
    router.route('/ipim/billingInformation/:_id')
        .patch(
            authorize,
            crud(models, {
                canSoftDelete
            }, 'ipimBillingInformation').update
        )
}