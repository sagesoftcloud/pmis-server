/***
 * File name: admin.js
 *
 * Program Description:
 * User role privilegas for the role of `Admin`
 *
 * admin.js contains the specific settings for each route
 * privilege contained within the application.
 *
 * Module Exports:
 * - Array containing the list of privileges the user role is entitled to.
 * To be explained in depth within the `privileges` folder.
 */


module.exports = {
    label: 'Super Admin',
    roleType: 'Internal',
    privileges: [
        // account management
        'login',
        'logout',
        'loginByUserRole',
        'loginWithUserType',
        'session',
        'verifyEmail',
        'viewSession',
        'requestChangePassword',
        'changePassword',
        'requestResetPassword',
        'resetPassword',
        'forgotPassword',
        'viewOwnProfile',
        'updateOwnProfile',
        'postOwnProfilePicture',
        'getOwnProfilePicture',
        'deleteOwnProfilePicture',

        // user management
        'createUsers',
        'createByUserRole',
        'operateRole',
        'readUsers',
        'softDeleteMultipleUsers',
        'readUsersByUserRole',
        'getValidationByUserRole',
        'readUserByUserRole',
        'updateUserByUserRole',
        'deleteUserByUserRole',
        'activateUserByUserRole',
        'deactivateUserByUserRole',
        'softDeleteUserByUserRole',
        'viewPublicProfile',

        // role management
        'viewAllRoles',
        'viewRolesSummary',
        'viewRole',
        'createRole',
        'updateRole',
        'deleteRole',
        'multipleOperateRole',

        // project list
        'postProject',
        'viewAllProject',
        'viewProject',
        'patchProject',
        'deleteProject',
        'postProjectTask',
        'viewAllProjectTask',
        'viewProjectTask',
        'patchProjectTask',
        'deleteProjectTask',
        // lineItemBudget
        'postLineItemBudget',
        'viewAllLineItemBudget',
        'viewLineItemBudget',
        'patchLineItemBudget',
        'deleteLineItemBudget',
        // actualExpenses
        'postActualExpenses',
        'viewAllActualExpenses',
        'viewActualExpenses',
        'patchActualExpenses',
        'deleteActualExpenses',

        // master data
        // app configurations
        'viewConfigurations',
        'patchConfigurations',
        // department
        'postDepartment',
        'viewAllDepartment',
        'viewDepartment',
        'patchDepartment',
        'deleteDepartment',
        // project type
        'postProjectType',
        'viewAllProjectType',
        'viewProjectType',
        'patchProjectType',
        'deleteProjectType',
        //item type
        'postItemType',
        'viewAllItemType',
        'viewItemType',
        'patchItemType',
        'deleteItemType',
        //equipment
        'postEquipment',
        'viewAllEquipment',
        'viewEquipment',
        'patchEquipment',
        'deleteEquipment',
        // campus
        'postCampus',
        'viewAllCampus',
        'viewCampus',
        'patchCampus',
        'deleteCampus',
        // supplier
        'postSupplier',
        'viewAllSupplier',
        'viewSupplier',
        'patchSupplier',
        'deleteSupplier',

        // dashboard
        'viewDashboard',

        //reports access
        'postAuditLogReport',
        'viewAllAuditLogReport',
        'viewAuditLogReport',
        'postProjectReport',
        'viewAllProjectReport',
        'viewProjectReport',
        'postAccountingReport',
        'viewAllAccountingReport',
        'viewAccountingReport',
        'postFinanceReport',
        'viewAllFinanceReport',
        'viewFinanceReport',

        // finance
        'viewAllFinance',
        'viewFinance',
        'obligateFinance',
        'addDisbursementFinance',
        'addChecksFinance',
        'setToCompletedFinance',
        'restoreFinance',
        'uploadFinanceDocument',
        'downloadFinanceDocument',
        'deleteFinanceDocument',

        //notifications
        'viewOverdueNotification',
        'setOverdueNotification'
    ]
}