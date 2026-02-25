/***
 * File name: actualExpenses.config.js
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
 * - object: privileges for Actual Expenses
 */

module.exports = {
    postActualExpenses: {
        name: 'Create Actual Expenses',
        module: 'Master Data',
        route: [
            {
                name: '/actualExpenses',
                method: 'post',
                params: {
                }
            }
        ]
    },
    viewAllActualExpenses: {
        name: 'View All Actual Expenses',
        module: 'Master Data',
        route: [
            {
                name: '/actualExpenses',
                method: 'get',
                params: {
                }
            }
        ]
    },
    viewActualExpenses: {
        name: 'View Actual Expenses',
        module: 'Master Data',
        route: [
            {
                name: '/actualExpenses/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    patchActualExpenses: {
        name: 'Update Actual Expenses',
        module: 'Master Data',
        route: [
            {
                name: '/actualExpenses/:_id',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    deleteActualExpenses: {
        name: 'Delete Actual Expenses',
        module: 'Master Data',
        route: [
            {
                name: '/actualExpenses/:_id',
                method: 'delete',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/actualExpenses/multiple/delete',
                method: 'post',
                params: {
                }
            }
        ]
    }
}