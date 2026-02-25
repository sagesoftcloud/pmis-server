/***
 * File name: dashboard.js
 *
 * Description:
 * This file includes the HTTP request paths that are used for
 * checking a working backend, and database and email connectivity.
 *
 * Module Exports:
 * - function: Returns an Express router witn included HTTP request paths for
 * fetching dashboard data.
 */


const { authorize } = require('../config/auth')
const dashboard = require('../controllers/dashboard')

module.exports = (router) => {
    router.route(`/dashboard`)
        .get(
            authorize,
            dashboard.viewDashboard
        )
    router.route('/dashboard/overdue')
        .get(
            authorize,
            dashboard.viewOverdue
        )
}