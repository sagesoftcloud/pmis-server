/***
 * File name: appConfiguration.config.js
 * 
 * Description:
 * Configurations when accessing app configuration routes.
 * 
 * - These configurations contains the allowed parameters and method when 
 *   accessing the route.
 * - This is used in roles to control/limit the routes that can access
 *   by a user.
 * 
 * Module Exports:
 * - object: privileges for answer 
 */

module.exports = {
    viewConfigurations: {
        name: 'View Configurations',
        module: 'Master Data',
        route: [
            {
                name: '/appConfiguration',
                method: 'get',
                params: {
                }
            }
        ]
    },
    patchConfigurations: {
        name: 'Patch Configurations',
        module: 'Master Data',
        route: [
            {
                name: '/appConfiguration/:_id',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ] 
    }
}