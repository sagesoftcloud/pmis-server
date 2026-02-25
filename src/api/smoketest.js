/***
 * File name: smoketesst.js
 *
 * Description:
 * This file includes the HTTP request paths that are used for
 * checking a working backend, and database and email connectivity.
 *
 * Module Exports:
 * - function: Returns an Express router witn included HTTP request paths for
 * checking a working backend, and database and email connectivity.
 */


const { test, emailtest, usercount, getCurrentTime } = require('../services/smoketest')

module.exports = (router) => {
    router.route(`/utilities/test`)
        .get(test)

    router.route(`/utilities/emailtest`)
        .get(emailtest)

    router.route(`/utilities/usercount`)
        .get(usercount)

    router.route(`/utilities/getCurrentTime`)
        .get(getCurrentTime)
}