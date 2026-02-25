/***
 * File name: projectLeader.js
 *
 * Program Description:
 * User role privilegas for the role of `Project Leader`
 *
 * projectLeader.js contains the specific settings for each route
 * privilege contained within the application.
 *
 * Module Exports:
 * - Array containing the list of privileges the user role is entitled to.
 * To be explained in depth within the `privileges` folder.
 */


module.exports = {
    label: 'Project Leader',
    roleType: 'Internal',
    privileges: [
        // account management
        'login',
        'loginByUserRole',
        'loginWithUserType',
        'logout',
        'session',
        'viewSession',
        'requestChangePassword',
        'changePassword',
        'requestResetPassword',
        'resetPassword',
        'forgotPassword',
        'verifyEmail',

        'viewOwnProfile',
        'updateOwnProfile',
        'postOwnProfilePicture',
        'getOwnProfilePicture',
        'deleteOwnProfilePicture',

        // user management
        'readUsers',
        'readUserByUserRole',

        // role management
        'viewAllRoles',

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
        //lineItemBudget
        'postLineItemBudget',
        'viewAllLineItemBudget',
        'viewLineItemBudget',
        'patchLineItemBudget',
        'deleteLineItemBudget',
        //actualExpenses
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
        // project type
        'postProjectType',
        'viewAllProjectType',
        'viewProjectType',
        'patchProjectType',
        //item type
        'postItemType',
        'viewAllItemType',
        'viewItemType',
        'patchItemType',
        //equipment
        'postEquipment',
        'viewAllEquipment',
        'viewEquipment',
        'patchEquipment',
        // campus
        'postCampus',
        'viewAllCampus',
        'viewCampus',
        'patchCampus',
        // supplier
        'postSupplier',
        'viewAllSupplier',
        'viewSupplier',
        'patchSupplier',

        // dashboard
        'viewDashboard',

        //reports access
        'postAuditLogReport',
        'postProjectReport',

        //notifications
        'viewOverdueNotification',
        'setOverdueNotification'
    ]
}