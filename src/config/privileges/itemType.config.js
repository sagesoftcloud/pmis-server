/***
 * File name: itemType.config.js
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
 * - object: privileges for item type
 */

module.exports = {
    postItemType: {
        name: 'Create Item Type',
        module: 'Master Data',
        route: [
            {
                name: '/itemType',
                method: 'post',
                params: {
                }
            }
        ]
    },
    viewAllItemType: {
        name: 'View All Item Type',
        module: 'Master Data',
        route: [
            {
                name: '/itemType',
                method: 'get',
                params: {
                }
            }
        ]
    },
    viewItemType: {
        name: 'View Item Type',
        module: 'Master Data',
        route: [
            {
                name: '/itemType/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    patchItemType: {
        name: 'Update Item Type',
        module: 'Master Data',
        route: [
            {
                name: '/itemType/:_id',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    deleteItemType: {
        name: 'Delete Item Type',
        module: 'Master Data',
        route: [
            {
                name: '/itemType/:_id',
                method: 'delete',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/itemType/multiple/delete',
                method: 'post',
                params: {
                }
            }
        ]
    }
}