/***
 * File name: projectType.config.js
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
 * - object: privileges for projectType
 */

module.exports = {
    postProjectType: {
        name: 'Create Project Type',
        module: 'Master Data',
        route: [
            {
                name: '/projectType',
                method: 'post',
                params: {
                }
            }
        ]
    },
    viewAllProjectType: {
        name: 'View All Project Type',
        module: 'Master Data',
        route: [
            {
                name: '/projectType',
                method: 'get',
                params: {
                }
            }
        ]       
    },
    viewProjectType: {
        name: 'View Project Type',
        module: 'Master Data',
        route: [
            {
                name: '/projectType/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            }
        ]       
    },
    patchProjectType: {
        name: 'Update Project Type',
        module: 'Master Data',
        route: [
            {
                name: '/projectType/:_id',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]       
    },
    deleteProjectType: {
        name: 'Delete Project Type',
        module: 'Master Data',
        route: [
            {
                name: '/projectType/:_id',
                method: 'delete',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/projectType/multiple/delete',
                method: 'post',
                params: {
                }
            }
        ]       
    }
}