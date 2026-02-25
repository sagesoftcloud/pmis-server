/***
 * File name: answer.config.js
 *
 * Description:
 * Configurations when accessing report routes.
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
    postAuditLogReport: {
        name: 'Create Audit Log Report',
        module: 'Report',
        route: [
            {
                name: '/report/auditLogs',
                method: 'post',
                params: {
                }
            }
        ]
    },
    viewAllAuditLogReport: {
        name: 'View All Audit Reports',
        module: 'Report',
        route: [
            {
                name: '/report/auditLogs',
                method: 'get',
                params: {
                }
            }
        ]
    },
    viewAuditLogReport: {
        name: 'View Audit Log Report',
        module: 'Report',
        route: [
            {
                name: '/report/auditLogs/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    postProjectReport: {
        name: 'Create Project Report',
        module: 'Report',
        route: [
            {
                name: '/report/project',
                method: 'post',
                params: {
                }
            }
        ]
    },
    viewAllProjectReport: {
        name: 'View All Project Reports',
        module: 'Report',
        route: [
            {
                name: '/report/project',
                method: 'get',
                params: {
                }
            }
        ]
    },
    viewProjectReport: {
        name: 'View Report',
        module: 'Report',
        route: [
            {
                name: '/report/project/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    postAccountingReport: {
        name: 'Create Accounting Report',
        module: 'Report',
        route: [
            {
                name: '/report/accounting',
                method: 'post',
                params: {
                }
            }
        ]
    },
    viewAllAccountingReport: {
        name: 'View All Accounting Reports',
        module: 'Report',
        route: [
            {
                name: '/report/accounting',
                method: 'get',
                params: {
                }
            }
        ]
    },
    viewAccountingReport: {
        name: 'View Accounting Report',
        module: 'Report',
        route: [
            {
                name: '/report/accounting/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    },
    postFinanceReport: {
        name: 'Create Finance Report',
        module: 'Report',
        route: [
            {
                name: '/report/finance',
                method: 'post',
                params: {
                }
            }
        ]
    },
    viewAllFinanceReport: {
        name: 'View All Finance Reports',
        module: 'Report',
        route: [
            {
                name: '/report/finance',
                method: 'get',
                params: {
                }
            }
        ]
    },
    viewFinanceReport: {
        name: 'View Finance Report',
        module: 'Report',
        route: [
            {
                name: '/report/finance/:_id',
                method: 'get',
                params: {
                    _id: [ '*' ]
                }
            }
        ]
    }
}