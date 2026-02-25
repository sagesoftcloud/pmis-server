/***
 * File name: index.js
 *
 * Description:
 * This file aggregates all Express routers used.
 *
 * Module Exports:
 * - router: The Express router which contains all HTTP routes.
 */


const express = require('express')

// Need to disable above rule to allow use of express.Router() which is a class
// eslint-disable-next-line new-cap
const router = express.Router()

require('./smoketest')(router, '')
require('./attachment')(router, '')
require('./report')(router, '')
require('./dashboard')(router, '')
require('./finance')(router, '')
require('./crud')(router, '')
require('./notification')(router, '')
require('./history')(router, '')
require('./ipim')(router, '')

module.exports = router