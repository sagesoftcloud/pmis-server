/***
 * File name: campus.config.js
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
 * - object: privileges for campus
 */

module.exports = {
    postCampus: {
        name: 'Create Campus',
        module: 'Master Data',
        route: [
            {
                name: '/campus',
                method: 'post',
                params: {
                }
            }
        ]
    },
    viewAllCampus: {
        name: 'View All Campus',
        module: 'Master Data',
        route: [
            {
                name: '/campus',
                method: 'get',
                params: {
                }
            }
        ]
    },
    viewCampus: {
        name: 'View Campus',
        module: 'Master Data',
        route: [
            {
                name: '/campus/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    patchCampus: {
        name: 'Update Campus',
        module: 'Master Data',
        route: [
            {
                name: '/campus/:_id',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    deleteCampus: {
        name: 'Delete Campus',
        module: 'Master Data',
        route: [
            {
                name: '/campus/:_id',
                method: 'delete',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/campus/multiple/delete',
                method: 'post',
                params: {
                }
            }
        ]
    }
}