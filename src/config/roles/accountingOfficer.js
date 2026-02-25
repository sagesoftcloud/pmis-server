/***
 * File name: accountingOfficer.js
 *
 * Program Description:
 * User role privilegas for the role of `Accounting Unit Head/Officer`
 *
 * accountingOfficer.js contains the specific settings for each route
 * privilege contained within the application.
 *
 * Module Exports:
 * - Array containing the list of privileges the user role is entitled to.
 * To be explained in depth within the `privileges` folder.
 */


module.exports = {
    label: 'Accounting Unit Head/Officer',
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
        'readUsers',

        // project list
        'viewAllProject',
        'viewProject',
        'viewAllProjectTask',
        'viewProjectTask',
        // lineItemBudget
        'viewAllLineItemBudget',
        'viewLineItemBudget',
        // actualExpenses
        'viewAllActualExpenses',
        'viewActualExpenses',

        // dashboard
        'viewDashboard',

        // report access
        'postAccountingReport',

        // finance
        'viewAllFinance',
        'viewFinance',
        'addDisbursementFinance',
        'uploadFinanceDocument',
        'downloadFinanceDocument',
        'deleteFinanceDocument',

        // notifications
        'viewOverdueNotification',
        'setOverdueNotification',

        // master data
        // department
        'viewAllDepartment',
        // project type
        'viewAllProjectType',
        //item type
        'viewAllItemType',
        //equipment
        'viewAllEquipment',
        // campus
        'viewAllCampus',
        // projectType
        'viewAllProjectType',
        // supplier
        'viewAllSupplier'
    ]
}