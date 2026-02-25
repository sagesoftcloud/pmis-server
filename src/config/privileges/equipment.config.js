/***
 * File name: equipment.config.js
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
 * - object: privileges for equipment
 */

module.exports = {
    postEquipment: {
        name: 'Create Equipment',
        module: 'Master Data',
        route: [
            {
                name: '/equipment',
                method: 'post',
                params: {
                }
            }
        ]
    },
    viewAllEquipment: {
        name: 'View All Equipment',
        module: 'Master Data',
        route: [
            {
                name: '/equipment',
                method: 'get',
                params: {
                }
            }
        ]
    },
    viewEquipment: {
        name: 'View Equipment',
        module: 'Master Data',
        route: [
            {
                name: '/equipment/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    patchEquipment: {
        name: 'Update Equipment',
        module: 'Master Data',
        route: [
            {
                name: '/equipment/:_id',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    deleteEquipment: {
        name: 'Delete Equipment',
        module: 'Master Data',
        route: [
            {
                name: '/equipment/:_id',
                method: 'delete',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/equipment/multiple/delete',
                method: 'post',
                params: {
                }
            }
        ]
    }
}