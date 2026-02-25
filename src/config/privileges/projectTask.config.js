/***
 * File name: projectTask.config.js
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
 * - object: privileges for projectTask
 */

module.exports = {
    postProjectTask: {
        name: 'Create Project Task',
        module: 'Master Data',
        route: [
            {
                name: '/projectTask',
                method: 'post',
                params: {
                }
            },
            {
                name: '/attachment/:_model/:_id/:_fieldName',
                method: 'post',
                params: {
                    _model: [ 'projectTask' ],
                    _id: [ '*' ],
                    _fieldName: [ 'documents' ]
                }
            }
        ]
    },
    viewAllProjectTask: {
        name: 'View All Project Task',
        module: 'Master Data',
        route: [
            {
                name: '/projectTask',
                method: 'get',
                params: {
                }
            }
        ]
    },
    viewProjectTask: {
        name: 'View Project Task',
        module: 'Master Data',
        route: [
            {
                name: '/projectTask/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/attachment/:_model/:_id/:_fieldName/:_fileName',
                method: 'get',
                params: {
                    _model: [ 'projectTask' ],
                    _id: [ '*' ],
                    _fieldName: [ 'documents' ],
                    _fileName: [ '*' ]
                }
            }
        ]
    },
    patchProjectTask: {
        name: 'Update Project Task',
        module: 'Master Data',
        route: [
            {
                name: '/projectTask/:_id',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/attachment/:_model/:_id/:_fieldName/:_fileName',
                method: 'patch',
                params: {
                    _model: [ 'projectTask' ],
                    _id: [ '*' ],
                    _fieldName: [ 'documents' ],
                    _fileName: [ '*' ]
                }
            },
            {
                name: '/attachment/:_model/:_id/:_fieldName/:_operate/multiple',
                method: 'patch',
                params: {
                    _model: [ 'projectTask' ],
                    _id: [ '*' ],
                    _fieldName: [ 'documents' ],
                    _operate: [
                        'activate',
                        'archive'
                    ]
                }
            },
            {
                name: '/attachment/:_model/:_id/:_fieldName/:_fileName/:_operate',
                method: 'patch',
                params: {
                    _model: [ 'projectTask' ],
                    _id: [ '*' ],
                    _fieldName: [ 'documents' ],
                    _fileName: [ '*' ],
                    _operate: [
                        'activate',
                        'archive'
                    ]
                }
            }
        ]
    },
    deleteProjectTask: {
        name: 'Delete Project Task',
        module: 'Master Data',
        route: [
            {
                name: '/projectTask/:_id',
                method: 'delete',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/projectTask/multiple/delete',
                method: 'post',
                params: {
                }
            },
            {
                name: '/attachment/:_model/:_id/:_fieldName/:_index/:_fileName',
                method: 'delete',
                params: {
                    _model: [ 'projectTask' ],
                    _id: [ '*' ],
                    _fieldName: [ 'documents' ],
                    _index: [ '*' ],
                    _fileName: [ '*' ]
                }
            }
        ]
    }
}