/***
 * File name: lineItemBudget.config.js
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
 * - object: privileges for lineItemBudget
 */

module.exports = {
    postLineItemBudget: {
        name: 'Create Line Item Budget',
        module: 'Master Data',
        route: [
            {
                name: '/lineItemBudget',
                method: 'post',
                params: {
                }
            }
        ]
    },
    viewAllLineItemBudget: {
        name: 'View All Line Item Budget',
        module: 'Master Data',
        route: [
            {
                name: '/lineItemBudget',
                method: 'get',
                params: {
                }
            }
        ]
    },
    viewLineItemBudget: {
        name: 'View Line Item Budget',
        module: 'Master Data',
        route: [
            {
                name: '/lineItemBudget/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    patchLineItemBudget: {
        name: 'Update Line Item Budget',
        module: 'Master Data',
        route: [
            {
                name: '/lineItemBudget/:_id',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    deleteLineItemBudget: {
        name: 'Delete Line Item Budget',
        module: 'Master Data',
        route: [
            {
                name: '/lineItemBudget/:_id',
                method: 'delete',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/lineItemBudget/multiple/delete',
                method: 'post',
                params: {
                }
            }
        ]
    }
}