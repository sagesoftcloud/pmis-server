/***
 * File name: auth.config.js
 *
 * Description:
 * Configurations when accessing auth routes.
 *
 * - These configurations contains the allowed parameters and method when
 *   accessing the route.
 * - This is used in roles to control/limit the routes that can access
 *   by a user.
 * - The list of privileges for auth is coming from the dependency.
 * - These privileges contains auth related processes like login, logout,
 *   view profile and other processes related to user.
 *
 * Module Exports:
 * - object: privileges for auth
 */

const privileges = require('maroon-auth/generatePrivileges')([ 'default' ])

module.exports = privileges