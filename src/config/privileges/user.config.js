/***
 * File name: user.config.js
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
    postOwnProfilePicture: {
        name: 'Upload Profile Picture',
        module: 'Role Management',
        route: [
            {
                name: '/attachment/:_model/:_id/:_fieldName',
                method: 'post',
                params: {
                    _id: [ '*' ],
                    _model: [ 'user' ],
                    _fieldName: [ 'profilePicture' ]
                }
            }
        ]
    },

    deleteOwnProfilePicture: {
        name: 'Delete Profile Picture',
        module: 'Role Management',
        route: [
            {
                name: '/attachment/:_model/:_id/:_fieldName/:_fileName',
                method: 'delete',
                params: {
                    _id: [ '*' ],
                    _model: [ 'user' ],
                    _fieldName: [ 'profilePicture' ],
                    __fileName: [ '*' ]
                }
            }
        ]
    },

    getOwnProfilePicture: {
        name: 'Download Profile Picture',
        module: 'Role Management',
        route: [
            {
                name: '/attachment/:_model/:_id/:_fieldName/:_fileName',
                method: 'get',
                params: {
                    _id: [ '*' ],
                    _model: [ 'user' ],
                    _fieldName: [ 'profilePicture' ],
                    __fileName: [ '*' ]
                }
            }
        ]
    }
}