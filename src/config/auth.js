/***
 * File name: auth.js
 *
 * Program Description:
 * Settings for the authentication module used by the application
 *
 * auth.js uses some of the variables defined in `index.js` and `meta.js` that
 * are required by the authentication module used by the application. The
 * `auth` object contains the specific settings defined within the application.
 *
 * Module Exports:
 * - auth: object containing authentication settings to be used by the
 * authentication module used by the application
 */


const {
    dbURL,
    smtpAuth,
    appData,
    pathToUse,
    authURL,
    protocol,
    domain,
    secret,
    cookieMaxAge,
    disableGuestAutoCreate,
    environment
} = require('./index')

const userModel = require('../models/user')
const {
    usernameRegex,
    passwordRegex,
    guestUserTemplate,
    usernamePath,
    padDates,
    padTimes
} = require('./meta')
const privileges = require('./privileges')
const maroonAuthMiddleware = require('../middlewares/maroonAuthMiddleware')(userModel)
const defaultAccessObject = require('./lib/generateDefaultConfig')(privileges)

const auth = require('maroon-auth')({
    uri: dbURL,
    configUri: authURL,
    settings: {
        environment,
        smtpAuth,
        appData,
        emailTemplatePathToUse: pathToUse,
        protocol,
        domain,
        secret,
        cookieMaxAge,
        minUsernameLength: 6,
        maxUsernameLength: Infinity,
        minPasswordLength: 8,
        maxPasswordLength: Infinity,
        otpExpiry: 900000,
        usernameValidation: usernameRegex,
        passwordValidation: passwordRegex,
        usernameValidationDescription: 'a valid e-mail address',
        passwordValidationDescription: 'a sequence of ten (10) or more characters',
        saltLength: 10,
        userLockoutTimeout: 180000,
        homepage: `${protocol}://${domain}`,
        showVerifyEmailButton: false,
        maxFailedLogins: 5,
        showLockoutRemaining: true,
        maxSessions: 20,
        uniqueEmail: false,
        usernamePath,
        beforeLogin: {
            userActive: true,
            emailVerified: false
        },
        guestUserTemplate,
        padDates,
        padTimes,
        verboseAuthorizeMessages: true,
        viewCreatedUsers: true,
        disableGuestAutoCreate,
        technicalMessage: false,
        customErrorMessages: {
            notActive: 'User is currently inactive or deactivated.'
        },
        existingErrorMessage: 'User already exists.',
        usersExcludedForBackupCodes: [ 'Internal' ],
        removeBackupCodeWhenUse: true,
        customMiddleware: maroonAuthMiddleware,
        storePreviousPasswords: true,
        maximumStoredPasswords: 3,
        autoLogOutEnabled: true,
        uniqueLabel: true,
        enableRoleFieldValidation: true
    },
    userModel,
    privileges,
    defaultAccessObject
})

module.exports = {
    ...auth
}