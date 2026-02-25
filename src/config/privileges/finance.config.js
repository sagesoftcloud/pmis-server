/***
 * File name: finance.config.js
 *
 * Description:
 * Configurations when accessing finance routes.
 *
 * - These configurations contains the allowed parameters and method when
 *   accessing the route.
 * - This is used in roles to control/limit the routes that can access
 *   by a user.
 *
 * Module Exports:
 * - object: privileges for Finance
 */

module.exports = {
    viewAllFinance: {
        name: 'View All Finance',
        module: 'Master Data',
        route: [
            {
                name: '/finance',
                method: 'get',
                params: {
                }
            },
            {
                name: '/finance/years/active',
                method: 'get',
                params: {
                }
            }
        ]
    },
    viewFinance: {
        name: 'View Finance',
        module: 'Master Data',
        route: [
            {
                name: '/finance/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    obligateFinance: {
        name: 'Obligate Finance',
        module: 'Master Data',
        route: [
            {
                name: '/finance/:_id/obligate',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    addDisbursementFinance: {
        name: 'Add Disbursement Finance',
        module: 'Master Data',
        route: [
            {
                name: '/finance/:_id/addDisbursement',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    addChecksFinance: {
        name: 'Add Checks Finance',
        module: 'Master Data',
        route: [
            {
                name: '/finance/:_id/addChecks',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    setToCompletedFinance: {
        name: 'Set to Completed Finance',
        module: 'Master Data',
        route: [
            {
                name: '/finance/:_id/setToCompleted',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    restoreFinance: {
        name: 'Restore Finance',
        module: 'Master Data',
        route: [
            {
                name: '/finance/:_id/restore',
                method: 'patch',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    uploadFinanceDocument: {
        name: 'Upload Finance Document',
        module: 'Master Data',
        route: [
            {
                name: '/attachment/:_model/:_id/:_fieldName',
                method: 'post',
                params: {
                    _model: [ 'finance' ],
                    _id: [ '*' ],
                    _fieldName: [ 'documents' ]
                }
            }
        ]
    },
    downloadFinanceDocument: {
        name: 'Download Finance Document',
        module: 'Master Data',
        route: [
            {
                name: '/attachment/:_model/:_id/:_fieldName/:_fileName',
                method: 'get',
                params: {
                    _model: [ 'finance' ],
                    _id: [ '*' ],
                    _fieldName: [ 'documents' ],
                    _fileName: [ '*' ]
                }
            }
        ]
    },
    deleteFinanceDocument: {
        name: 'Delete Finance Document',
        module: 'Master Data',
        route: [
            {
                name: '/attachment/:_model/:_id/:_fieldName/:_index/:_fileName',
                method: 'delete',
                params: {
                    _model: [ 'finance' ],
                    _id: [ '*' ],
                    _fieldName: [ 'documents' ],
                    _index: [ '*' ],
                    _fileName: [ '*' ]
                }
            }
        ]
    }
}