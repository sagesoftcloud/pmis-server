/***
 * File name: guest.js
 * 
 * Program Description:
 * User role privilegas for the role of `Guest`
 * 
 * guest.js contains the specific settings for each route
 * privilege contained within the application.
 * 
 * Module Exports:
 * - Array containing the list of privileges the user role is entitled to.
 * To be explained in depth within the `privileges` folder.
 */


module.exports = {
    label: 'Guest',
    roleType: 'External',
    privileges: [ 
        'login',
        'loginByUserRole',
        'logout',
        'loginWithUserType',
        'session',
        'verifyEmail',
        'requestResetPassword',
        'resetPassword',
        'changePassword',
        'viewSession',
        'requestChangePassword',
        'forgotPassword'
    ]
}