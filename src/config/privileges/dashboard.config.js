/***
 * File name: dashboard.config.js
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
 * - object: privileges for dashboard
 */

module.exports = {
    viewDashboard: {
        name: 'View Dashboard',
        module: 'Dashboard',
        route: [
            {
                name: '/dashboard',
                method: 'get'
            },
            {
                name: '/dashboard/overdue',
                method: 'get'
            }
        ]
    }
}