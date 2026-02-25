/***
 * File name: utils.js
 *
 * Description:
 * Utility functions used within the system
 *
 * Module Exports:
 * - getNestedValue: to get value nested within an object
 * - getUserId: helper function to get user id within an object
 * - formatQuery: helper function format query into an object
 * - setValueInFieldOfNestedOject: helper function to set value within a nested
 * field of an object
 * - setValueInArrayInNestedObject: helper function to set value within a
 * nested field of an array within an object
 * - getValueInArrayInNestedObject: helper function to get value within a nested
 * field of an object
 * - getValueInFieldfOfNestedObject: helper function to get value within a
 * nested field of an array within an object
 * - sentenceCase: helper function to parse messages into sentences
 * - setValueInFieldOfNestedObject: helper function to set value within a
 * nested field of an object
 * shuffleArrayData - examination helper where an array will be randomly shuffled
 * createGroups - examination helper where an array will be split in to groups
 * formatGroup - examination helper where an id will be added per array
 */


/* eslint-disable max-params */
/* eslint-disable no-extra-parens */
/* eslint-disable security/detect-object-injection */
const { ObjectId } = require('mongoose').Types
const fs = require('fs').promises
const { Storage } = require('@google-cloud/storage')
const { gcsKeyFilepath } = require('../config')
const storage = new Storage({
    keyFilename: gcsKeyFilepath
});

const utils = {
    getNestedValue: (obj, key) => key.split(".").reduce((acc, curr) => acc[`${curr}`], obj),
    getUserId: (userRole, user, userIDObj) => {
        const key = userIDObj[`${userRole}`] || userIDObj.default
        return {
            key,
            value: utils.getNestedValue(user, key)
        }
    },
    formatQuery: (query) => {
        // eslint-disable-next-line no-shadow
        const runQuery = (query) => {
            const newQuery = {
            }
            Object.keys(query).forEach((props) => {
                if (Array.isArray(query[`${props}`])) {
                    newQuery[`${props}`] = []
                    query[`${props}`].forEach((q) => {
                        if (typeof q === 'string') {
                            if (ObjectId.isValid(q)) {
                                // eslint-disable-next-line new-cap
                                newQuery[`${props}`].push(ObjectId(q))
                            }
                            else {
                                newQuery[`${props}`].push(q)
                            }
                        }
                        else {
                            newQuery[`${props}`].push(runQuery(q))
                        }
                    })
                }
                else if (ObjectId.isValid(query[`${props}`])) {
                    // eslint-disable-next-line new-cap
                    newQuery[`${props}`] = ObjectId(query[`${props}`])
                }
                else if (typeof query[`${props}`] === 'object') {
                    newQuery[props] = runQuery(query[`${props}`])
                }
                else {
                    newQuery[`${props}`] = query[`${props}`]
                }
            })
            return newQuery
        }

        return runQuery(query)
    },
    setValueInFieldOfNestedObject: (obj, [
        first,
        ...rest
    ], value) => ({
        ...obj,
        [`${first}`]: rest.length
            ? utils.setValueInFieldOfNestedObject(obj[`${first}`], rest, value)
            : value
    }),
    setValueInArrayInNestedObject: (obj, [
        first,
        ...rest
    ], value, index, fieldName) => ({
        ...obj,
        [`${first}`]: rest.length
            ? utils.setValueInArrayInNestedObject(obj[`${first}`], rest, value, index, fieldName)
            : obj[`${first}`].map((object, i) => {
                if (i === index) {
                    object[`${fieldName}`] = value
                    return object
                }
                return object
            })
    }),

    /* use a shallow copy of array in "path" */
    getValueInArrayInNestedObject: (obj, path, fieldInArray, index) => {
        if (!path.length) {
            return obj[`${index}`][`${fieldInArray}`]
        }
        return utils.getValueInArrayInNestedObject(obj[`${path.shift()}`], path, fieldInArray, index)
    },

    /* use a shallow copy of array in "path" */
    getValueInFieldfOfNestedObject: (obj, path) => {
        if (!path.length) {
            return obj
        }
        return utils.getValueInFieldfOfNestedObject(obj[`${path.shift()}`], path)
    },
    shuffleArrayData: (array) => {
        let currentIndex = array.length
        let randomIndex = 0

        // While there remain elements to shuffle...
        while (currentIndex !== 0) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            // eslint-disable-next-line no-plusplus
            currentIndex--;

            // And swap it with the current element.
            [
                array[`${currentIndex}`],
                array[`${randomIndex}`]
            ] = [
                array[`${randomIndex}`],
                array[`${currentIndex}`]
            ];
        }

        return array;
    },
    createGroups: (arr, numGroups) => {
        const perGroup = Math.ceil(arr.length / numGroups);
        return new Array(numGroups)
            .fill('')
            .map((_, i) => arr.slice(i * perGroup, (i + 1) * perGroup));
    },
    formatGroup: (groupData, segmentIds) => {
        const newGroup = groupData.map((testItems, order) => {
            const newExamSegment = {
                items: testItems,
                order: order + 1
            }

            if(segmentIds && segmentIds[`${order}`]) {
                newExamSegment._id = segmentIds[`${order}`]
            }

            return newExamSegment
        })
        return newGroup
    },
    unlinkFileFromFilePath: async (file, cb) => {
        if (file && (file.length || Object.keys(file).length)) {
            let { path } = file
            if (Array.isArray(file)) {
                // eslint-disable-next-line prefer-destructuring
                path = file[0].path
            }
            try {
                if (gcsKeyFilepath) {
                    const fileName = `${file.destination}${file.filename}`
                    await storage.bucket(file.bucket).file(fileName)
                        .delete();
                    
                }
                else {
                    // eslint-disable-next-line security/detect-non-literal-fs-filename
                    await fs.unlink(path, (err) => {
                        if (err) {
                            throw err
                        }
                    })
                }
            }
            catch (err) {
                cb(err)
            }
        }
    },
    // eslint-disable-next-line security/detect-unsafe-regex
    sentenceCase: (str) => str.replace(/(?<camelCase>[A-Z])/gu, ' $1').replace(/^./u, (s) => s.toUpperCase()),
    errorMessage: (error) => {
        const errMessage = error.message
        if (String(error.message).includes('validation')) {
            const messageArr = errMessage.split(':')
            const messages = messageArr.splice(-1)
            return `Validation Error:${messages[0]}`
        }
        if (String(error.message).includes('Cast')) {
            const [ , fieldName ] = errMessage.split(':')
            return `Validation Error:${fieldName}`
        }
        else if (String(error.message).includes('set property')) {
            return `Validation Error: Please enter a valid ObjectID to update.`
        }
        return errMessage
    },
    modelExists: (models, _model) => {
        if (!models[`${_model}`]) {
            throw new Error(`Collection named '${_model}' does not exist.`)
        }
        return models[`${_model}`]
    },
    handleUniqueConstraints: async (model, info) => {
        const indexes = await model.listIndexes()
        let fields = indexes.map((index) => {
            if(index.unique) {
                return Object.keys(index.key)
            }
            return []
        })
        fields = fields.flat()

        const uniqueConstraint = {
        }
        for(const field of fields) {
            uniqueConstraint[`${field}`] = info[`${field}`]
        }

        if (Object.keys(uniqueConstraint).length > 0) {
            const check = await model.findOne({
                ...uniqueConstraint
            })

            if (check && check._status === 'active') {
                throw new Error('Document already exists.')
            }

            if (check && check._status === 'deleted') {
                await model.deleteOne(check)
            }
        }
    },
    sortArray: (array, fieldName, order = 1) => array.sort((a, b) => {
        if (a[`${fieldName}`] < b[`${fieldName}`]) {
            return -1 * order;
        }
        if (a[`${fieldName}`] > b[`${fieldName}`]) {
            return order;
        }
        return 0;
    }),
    cloneArray: (array) => JSON.parse(JSON.stringify(array))
}

module.exports = utils