/***
 * File name: notification.js
 *
 * Description:
 * This file includes the HTTP request paths that are used for
 * checking a working backend, and database and email connectivity.
 *
 * Module Exports:
 * - function: Returns an Express router witn included HTTP request paths for
 * fetching notification data.
 */


const { authorize } = require('../config/auth')
const notification = require('../controllers/notification')
 
module.exports = (router) => {
    router.route(`/overdueNotification`)
        .get(
            authorize,
            notification.viewOverdueNotification
        )
        .patch(
            authorize,
            notification.setOverdueNotification
        )        
}