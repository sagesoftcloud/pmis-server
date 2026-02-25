/***
 * File name: index.js
 * 
 * Description:
 * Process all files inside schema folder for export.
 * 
 * - Get all the schema/structure inside of models folder (except for index.js
 *   then group it for easy export
 * 
 * Module Exports:
 * - schemas: All of the schema/structure inside of schema folder.
 */

/* eslint-disable global-require */
/* eslint-disable no-sync */
const fs = require('fs')
const path = require('path')
const { Schema } = require('mongoose')
const { toCamelCase } = require('js-utils').parser

const schemas = {
}

const libPath = path.join(__dirname, '')
// eslint-disable-next-line security/detect-non-literal-fs-filename
fs.readdirSync(libPath).forEach((file) => {
    if (![ "index.js" ].includes(file)) {
        // eslint-disable-next-line security/detect-non-literal-require
        const schemaObj = require(`./${file}`)
        const schemaName = toCamelCase({
            file 
        })
        schemas[`${schemaName}`] = new Schema(schemaObj)
    }
})

module.exports = schemas