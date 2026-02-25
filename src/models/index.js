/***
 * File name: index.js
 * 
 * Description:
 * Process all files inside models folder for export.
 * 
 * - Get all the models inside of models folder (except for lib folder and
 *   index.js) then group it for easy export
 * 
 * Module Exports:
 * - models: All of the models inside of models folder.
 */

/* eslint-disable global-require */
/* eslint-disable no-sync */
const fs = require('fs')
const path = require('path')
const { toCamelCase } = require('js-utils').parser

const models = {
}

const libPath = path.join(__dirname, '')
// eslint-disable-next-line security/detect-non-literal-fs-filename
fs.readdirSync(libPath).forEach((file) => {
    if (![
        "index.js",
        "utils.js",
        "lib",
        "configuration"
    ].includes(file)) {
        // eslint-disable-next-line security/detect-non-literal-require
        const model = require(`./${file}`)
        const modelName = toCamelCase({
            file 
        })
        models[`${modelName}`] = model
    }
})

module.exports = models