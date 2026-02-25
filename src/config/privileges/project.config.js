/***
 * File name: project.config.js
 *
 * Description:
 * Configurations when accessing project routes.
 *
 * - These configurations contains the allowed parameters and method when
 *   accessing the route.
 * - This is used in roles to control/limit the routes that can access
 *   by a user.
 *
 * Module Exports:
 * - object: privileges for project
 */

const attachmentFieldNames = [
    'termsOfReference',
    'contract',
    'noticeToProceed',
    'billOfQuantity',
    'documents'
]

module.exports = {
    postProject: {
        name: 'Create Project',
        module: 'Master Data',
        route: [
            {
                name: '/project',
                method: 'post',
                params: {
                }
            },
            {
                name: '/attachment/:_model/:_id/:_fieldName',
                method: 'post',
                params: {
                    _model: [ 'project' ],
                    _id: [ '*' ],
                    _fieldName: attachmentFieldNames
                }
            },
            {
                name: '/ipim/monthlyReport',
                method: 'post',
                params: {
                }
            },
            {
                name: '/ipim/billingInformation',
                method: 'post',
                params: {
                }
            }
        ]
    },
    viewAllProject: {
        name: 'View All Project',
        module: 'Master Data',
        route: [
            {
                name: '/project',
                method: 'get',
                params: {
                }
            },
            {
                name: '/project/years/active',
                method: 'get',
                params: {
                }
            }
        ]
    },
    viewProject: {
        name: 'View Project',
        module: 'Master Data',
        route: [
            {
                name: '/project/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/attachment/:_model/:_id/:_fieldName/:_fileName',
                method: 'get',
                params: {
                    _model: [ 'project' ],
                    _id: [ '*' ],
                    _fieldName: attachmentFieldNames,
                    _fileName: [ '*' ]
                }
            },
            {
                name: '/history/:_model/:_id',
                method: 'get',
                params: {
                    _model: [ 'project' ],
                    _id: [ '*' ]
                }
            },
            {
                name: '/ipim/monthlyReport/latest/:_projectId',
                method: 'get',
                params: {
                    _projectId: [ '*' ]
                }
            },
            {
                name: '/ipim/monthlyReport/reports/:_projectId',
                method: 'get',
                params: {
                    _projectId: [ '*' ]
                }
            },
            {
                name: '/ipim/billingInformation/:_projectId',
                method: 'get',
                params: {
                    _projectId: [ '*' ]
                }
            }
        ]
    },
    patchProject: {
        name: 'Update Project',
        module: 'Master Data',
        route: [
            {
                name: '/project/:_id',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/attachment/:_model/:_id/:_fieldName/:_fileName',
                method: 'patch',
                params: {
                    _model: [ 'project' ],
                    _id: [ '*' ],
                    _fieldName: attachmentFieldNames,
                    _fileName: [ '*' ]
                }
            },
            {
                name: '/attachment/:_model/:_id/:_fieldName/:_operate/multiple',
                method: 'patch',
                params: {
                    _model: [ 'project' ],
                    _id: [ '*' ],
                    _fieldName: attachmentFieldNames,
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
                    _model: [ 'project' ],
                    _id: [ '*' ],
                    _fieldName: attachmentFieldNames,
                    _fileName: [ '*' ],
                    _operate: [
                        'activate',
                        'archive'
                    ]
                }
            },
            {
                name: '/ipim/monthlyReport/:_id',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/ipim/billingInformation/:_id',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    deleteProject: {
        name: 'Delete Project',
        module: 'Master Data',
        route: [
            {
                name: '/project/:_id',
                method: 'delete',
                params: {
                    _id: [ '*' ]
                }
            },
            {
                name: '/project/multiple/delete',
                method: 'post',
                params: {
                }
            },
            {
                name: '/attachment/:_model/:_id/:_fieldName/:_index/:_fileName',
                method: 'delete',
                params: {
                    _model: [ 'project' ],
                    _id: [ '*' ],
                    _fieldName: attachmentFieldNames,
                    _index: [ '*' ],
                    _fileName: [ '*' ]
                }
            }
        ]
    }
}