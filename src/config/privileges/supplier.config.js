
/***
 * File name: supplier.config.js
 *
 * Description:
 * Configurations when accessing supplier routes.
 *
 * - These configurations contains the allowed parameters and method when
 *   accessing the route.
 * - This is used in roles to control/limit the routes that can access
 *   by a user.
 *
 * Module Exports:
 * - object: privileges for supplier
 */

module.exports = {
    postSupplier: {
        name: 'Create Supplier',
        module: 'Master Data',
        route: [
            {
                name: '/supplier',
                method: 'post',
                params: {
                }
            }
        ]
    },
    viewAllSupplier: {
        name: 'View All Supplier',
        module: 'Master Data',
        route: [
            {
                name: '/supplier',
                method: 'get',
                params: {
                }
            }
        ]
    },
    viewSupplier: {
        name: 'View Supplier',
        module: 'Master Data',
        route: [
            {
                name: '/supplier/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    patchSupplier: {
        name: 'Update Supplier',
        module: 'Master Data',
        route: [
            {
                name: '/supplier/:_id',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    deleteSupplier: {
        name: 'Delete Supplier',
        module: 'Master Data',
        route: [
            {
                name: '/supplier/:_id',
                method: 'delete',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/supplier/multiple/delete',
                method: 'post',
                params: {
                }
            }
        ]
    }
}