/***
 * File name: department.config.js
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
 * - object: privileges for department 
 */

module.exports = {
    postDepartment: {
        name: 'Create Department',
        module: 'Master Data',
        route: [
            {
                name: '/department',
                method: 'post',
                params: {
                }
            }
        ]
    },
    viewAllDepartment: {
        name: 'View All Department',
        module: 'Master Data',
        route: [
            {
                name: '/department',
                method: 'get',
                params: {
                }
            }
        ]       
    },
    viewDepartment: {
        name: 'View Department',
        module: 'Master Data',
        route: [
            {
                name: '/department/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            }
        ]       
    },
    patchDepartment: {
        name: 'Update Department',
        module: 'Master Data',
        route: [
            {
                name: '/department/:_id',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]       
    },
    deleteDepartment: {
        name: 'Delete Department',
        module: 'Master Data',
        route: [
            {
                name: '/department/:_id',
                method: 'delete',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/department/multiple/delete',
                method: 'post',
                params: {
                }
            }
        ]       
    }
}