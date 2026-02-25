/* eslint-disable security/detect-object-injection */
/* eslint-disable no-undefined */
/* eslint-disable dot-notation */
/***
 * File name: attachment.js
 *
 * Description:
 *  Handles all attachement related functionalities
 *
 *
 *
 * Module Exports:
 *  Object Key Function:
 *  - model - points attachment from uploadMiddleware to the right model
 *  - array - points multiple files from uploadMiddleware to the right model
 *  - uploadMiddleware - uploads all types of files using multer (https://www.npmjs.com/package/multer)
 */

/* eslint-disable prefer-destructuring */
/* eslint-disable new-cap */
// False positive. Path is not given by the user.
/* eslint-disable security/detect-non-literal-fs-filename */
const { RequestError } = require('error-handler')
const attachmentService = require('../services/attachment')
const { gcsKeyFilepath } = require('../config')
const { Storage } = require('@google-cloud/storage')
const models = require('../models')
const sanitize = require('mongo-sanitize')
const { ObjectId } = require('mongoose').Types

module.exports = {
    post: async (req, res, next) => {
        try {
            const { _id, _model, _fieldName, _index } = req.params
            const { user } = req.session

            req.session.userType = req.session.oldUserType
            req.session.userID.value = req.session.oldUserIDValue
            delete req.session.oldUserType
            delete req.session.oldUserIDValue

            const data = await attachmentService.post({
                _id,
                _model,
                _fieldName,
                _index,
                user,
                reqFiles: req.files
            })

            res.status(200).json(data)
        }
        catch (err) {
            next(new RequestError(400, err.message))
        }
    },
    get: async (req, res, next) => {
        try {
            const { _id, _fileName, _fieldName, _model, _index } = req.params
            const { user = req.user } = req.session
            const { parse = 'true', dimensions, quality = '100' } = req.query

            let filename = _fileName
            let storage = null
            // encodeURI when using gcs
            if (gcsKeyFilepath) {
                filename = encodeURI(filename)
                storage = new Storage({
                    keyFilename: gcsKeyFilepath
                })
            }

            const data = await attachmentService.get({
                _id,
                filename,
                _model,
                _fieldName,
                _index,
                parse,
                dimensions,
                quality,
                storage,
                user
            })

            res.status(200).json(data)
        }
        catch (err) {
            next(new RequestError(400, err.message))
        }
    },
    operate: async (req, res, next) => {
        try {
            const { _id, _fileName, _fieldName, _model, _index, _operate } = req.params
            let filename = _fileName
            // encodeURI when using gcs
            if (gcsKeyFilepath) {
                filename = encodeURI(filename)
            }

            const data = await attachmentService.operate({
                _id,
                filename,
                _fieldName,
                _model,
                _index,
                _operate
            })

            res.status(200).json(data)
        }
        catch (error) {
            next(new RequestError(400, error.message))
        }
    },
    multipleOperate: async (req, res, next) => {
        try {
            const { _id, _fieldName, _model, _operate } = req.params
            const { user = req.user } = req.session
            const { fileNames, fileIds, taggedDocuments } = req.body

            let filenames = fileNames

            // encodeURI when using gcs
            if (gcsKeyFilepath && filenames) {
                filenames = filenames.map((filename) => encodeURI(filename))
            }

            let data = null

            const multipleOperateNormally = async () => {
                const model = models[`${_model}`]
                const doc = await model.findById(sanitize(_id))

                if (!doc) {
                    throw new Error('Document not found.')
                }

                const results = attachmentService.validateFileNames({
                    _id,
                    _fieldName,
                    _model,
                    _operate,
                    fileNames,
                    doc
                })

                data = await attachmentService.multipleOperate({
                    _operate,
                    fileNames: filenames,
                    doc,
                    results
                })

                const updaterDoc = await models.user.findById(user)

                const revisionAction = _operate === 'activate' ? 'Recovered' : 'Archived'

                const fileNamesCommaSeparated = filenames.join(', ')

                doc._revision = {
                    author: {
                        userModel: models.user.constructor.modelName,
                        doc: new ObjectId(updaterDoc._id)
                    },
                    description: `${revisionAction} file(s): ${fileNamesCommaSeparated}.`
                }

                await doc.save()
            }

            if(_model === 'project') {
                if (fileIds) {
                    if (!fileIds.length) {
                        throw new Error('fileIds are required.')
                    }
                    data = await attachmentService.handleProjectMultipleOperate({
                        _id,
                        _fieldName,
                        _operate,
                        fileIds,
                        user
                    })
                }

                else if (taggedDocuments) {
                    const docs = await Promise.all(taggedDocuments.map(async (document) => {
                        const model = models[`${document.model}`]
                        const doc = await model.findById(sanitize(document.documentId))

                        if (!doc) {
                            throw new Error('Document not found')
                        }
                        return {
                            doc,
                            filename: document.filename
                        }
                    }))

                    data = await attachmentService.multipleOperateTaggedDocuments({
                        _id,
                        _fieldName,
                        _model,
                        _operate,
                        taggedDocuments
                    })

                    // patches
                    const updaterDoc = await models.user.findById(user)

                    const revisionAction = _operate === 'activate' ? 'Recovered' : 'Archived'

                    await Promise.all(docs.map((doc) => {
                        doc.doc._revision = {
                            author: {
                                userModel: models.user.constructor.modelName,
                                doc: new ObjectId(updaterDoc._id)
                            },
                            description: `${revisionAction} ${doc.filename}`
                        }
                        return doc.doc.save()
                    }))
                }

                else {
                    await multipleOperateNormally()
                }
            }

            else {
                await multipleOperateNormally()
            }

            res.status(200).json(data)
        }
        catch (error) {
            next(new RequestError(400, error.message))
        }
    },
    delete: async (req, res, next) => {
        try {
            const { user = req.user } = req.session
            const { _id, _fileName, _fieldName, _model, _index } = req.params

            let filename = _fileName
            if (gcsKeyFilepath) {
                filename = encodeURI(filename)
            }

            const data = await attachmentService.delete({
                _id,
                _fileName: filename,
                _fieldName,
                _model,
                _index,
                user
            })

            res.status(200).json(data)
        }
        catch(err) {
            next(new RequestError(400, err.message))
        }
    },
    updateOriginalName: async (req, res, next) => {
        try {
            const { _id, _fileName, _fieldName, _model } = req.params
            const { newOriginalName } = req.body
            const { user } = req.session

            const data = await attachmentService.updateOriginalName({
                _id,
                _fileName,
                _fieldName,
                _model,
                newOriginalName,
                user
            })

            res.status(200).json(data)
        }
        catch (err) {
            next(new RequestError(400, err.message))
        }
    }
}