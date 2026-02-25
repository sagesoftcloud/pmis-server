/***
 * File name: report.js
 *
 * Description:
 * This file includes the HTTP request paths that are used for
 * checking a working backend, and database and email connectivity.
 *
 * Module Exports:
 * - function: Returns an Express router witn included HTTP request paths for
 * updating report status.
 */


const { authorize } = require('../config/auth')
const report = require('../controllers/report')
const reportsAvailable = Object.keys(require('../reports')).filter((item) => item !== "userCount" && item !== "userList")

module.exports = (router) => {
    reportsAvailable.forEach((item) => {
        router.route(`/report/${item}`)
            .get(
                authorize,
                report.viewAll(item)
            )
            .post(
                authorize,
                report.create(item)
            )

        router.route(`/report/${item}/:_id`)
            .get(
                authorize,
                report.view
            )
    })
}