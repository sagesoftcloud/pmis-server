/***
 * File name: notification.config.js
 *
 * Description:
 * Configurations when accessing projectTask routes.
 *
 * - These configurations contains the allowed parameters and method when
 *   accessing the route.
 * - This is used in roles to control/limit the routes that can access
 *   by a user.
 *
 * Module Exports:
 * - object: privileges for notification
 */

module.exports = {
    viewOverdueNotification: {
        name: 'View Overdue Notification',
        module: 'Notification',
        route: [
            {
                name: '/overdueNotification',
                method: 'get'
            }
        ]
    },
    setOverdueNotification: {
        name: 'Set Overdue Notification',
        module: 'Notification',
        route: [
            {
                name: '/overdueNotification',
                method: 'patch'
            }
        ]
    }
}