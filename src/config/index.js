/***
 * File name: index.js
 *
 * Program Description:
 * index.js is used to export the app variable settings to the other modules
 * need by the application.
 *
 * Module Exports:
 * - environment: whether or not the application is running locally or deployed
 * on a server
 * - protocol: whether the application is hosted on an http or otherwise stated
 * in the `.env` file
 * - domain: domain of the application, to be specified in the `.env` file
 * - port: port where the application is hosted. If not stated in the `.env`
 * file, to default to 3001
 * - swaggerPort: port for hosting swagger documentation. To default to 9001
 * if not stated in the `.env` file
 * - dbURL: URL leading to database
 * - configDbURL: URL leading to the configuration of the database
 * - authURL: URL leading to the authentication configuration settings in the
 * database
 * - __homePath: Location of the EFS directory, where files are stored when
 * uploaded
 * - maxFileUploadSize: default max file upload size, can be overwritten by
 * `config/meta.js`
 * - smtpAuth: object containing SMTP settings of the application
 * - appData: project specific variables to be used by other modules
 * - pathToUse: path to use for modles
 * - secret: app based secret
 * - cookieMaxAge: max age for cookies in the system
 * - payloadMaxSize: max size for a single payload within the system
 * - corsOptions: whitelist of domains that have access to the
 * application's resources
 * - morganRules: settings for morgan rules, used in jest tests
 * - canSoftDelete: settings for allowing soft deletion
 * - automaticLoginOnSignUpEncryptionKey: settings for automatic login upon
 * sign up
 * - clientID: client id, to be set in `.env` file
 * - tenantId: tenant id, to be set in `.env` file
 * - redirectUrl: URL for redirection, to be set in `.env` file
 * - ssoRedirect: URL for redirection when using SSO, to be set in `.env` file
 * - baseUrl: base URL of application
 * - verboseErrorMessages: Setting for making error messages more user friendly
 */


/* eslint-disable no-invalid-this */
const path = require('path')

// Need to disable rule to enable importing environmental variable values via file
/* eslint-disable no-process-env */
require('dotenv').config()

const environment = process.env.ENVIRONMENT || 'local'

module.exports = {
    environment,
    protocol: process.env.PROTOCOL || 'http',
    domain: process.env.DOMAIN,
    port: process.env.PORT || 3001,
    swaggerPort: process.env.SWAGGER_PORT || 9001,
    dbURL: process.env.MONGO_URI,
    authURL: process.env.AUTH_DB_URI,
    __homePath: process.env.EFS_DIR,
    maxFileUploadSize: process.env.MAX_FILE_UPLOAD_SIZE || 5145728,
    smtpAuth: {
        service: process.env.SMTP_SERVICE || 'gmail',
        auth: {
            type: process.env.SMTP_AUTH_TYPE || 'OAuth2',
            user: process.env.SMTP_AUTH_USER || 'devops@maroonstudios.com',
            clientId: process.env.SMTP_AUTH_CLIENTID,
            clientSecret: process.env.SMTP_AUTH_CLIENTSECRET,
            refreshToken: process.env.SMTP_AUTH_REFRESHTOKEN,
            accessUrl: process.env.SMTP_AUTH_ACCESSURL || 'https://developers.google.com/oauthplayground'
        }
    },
    appData: {
        organization: "PSHS - Project Monitoring System",
        acronym: "PSHS-PMS",
        title: "PSHS - Project Monitoring System",
        email: "devops@maroonstudios.com",
        logo: "/pshs-logo.png",
        subjects: {
            otpHeader: 'OTP Login Verification'
        }
    },
    pathToUse: path.resolve('src'),
    secret: process.env.APP_SECRET,
    cookieMaxAge: process.env.COOKIE_MAX_AGE,
    payloadMaxSize: '20mb',
    corsOptions: {
        origin: environment === 'local' ? [
            'http://localhost:3000',
            'http://localhost',
            'https://login.microsoftonline.com'
        ] : [
            'http://localhost:3000',
            'http://maroon-studios.wiki.maroonstudios.com/phisci/pms-server/',
            'https://login.microsoftonline.com'
        ],
        credentials: true
    },
    morganRules: {
        default: ':method :url :status :response-time ms - :res[content-length]'
    },
    smokeTest: {
        email: 'jason.obrero@maroonstudios.com'
    },
    canSoftDelete: true,
    disableGuestAutoCreate: true,
    baseUrl: process.env.BASE_URL || '',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    awsS3Bucket: process.env.AWS_S3_BUCKET
}