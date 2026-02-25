/***
 * File name: middleware.js
 *
 * Program Description:
 * Middleware functions used for the security of some routes
 *
 */

/* eslint-disable max-depth */
const { RequestError } = require('error-handler')
const sanitize = require('mongo-sanitize')
const models = require('../models')
const initializeFiler = require("filer")
const { __homePath } = require('../config/index.js')
const { validateMappedRecords } = require('../models/lib/utils')
const { sentenceCase } = require('../lib/utils')

const canDeleteDocumentModels = [
    'department',
    'projectType',
    'itemType'
]

const projectAttachmentModules = [ 'cashManagement' ]

const deleteChecker = async ({ modelArr, foreignField, id, isMultiple = false }) => {
    let promises = []
    if (isMultiple) {
        promises = modelArr.map(async (model) => {
            try {
                const documentCount = await models[`${model}`].countDocuments({
                    [`${foreignField}`]: {
                        $in: id
                    }
                })
                return Promise.resolve(documentCount)
            }
            catch(error) {
                throw new Error(error)
            }
        })
    }
    else {
        promises = modelArr.map(async (model) => {
            try {
                const doc = await models[`${model}`].findOne({
                    [`${foreignField}`]: sanitize(id)
                })
                return Promise.resolve(doc ? 1 : 0)
            }
            catch(error) {
                throw new Error(error)
            }
        })
    }

    const result = await Promise.all(promises)

    if (result.some((item) => item > 0)) {
        throw new Error(id.length > 1
            ? `One or more of the selected ${sentenceCase(foreignField)}(s) is currently mapped to other document(s).`
            : `Selected ${sentenceCase(foreignField)} is already mapped to other document(s).`)
    }
}

module.exports = {
    canDeleteDocument: (m) => async (req, res, next) => {
        try {
            const _model = m

            if (canDeleteDocumentModels.includes(_model)) {

                if (_model === 'department') {
                    const modelArr = [
                        'user',
                        'project'
                    ]
                    const foreignField = 'department'

                    if(req.originalUrl.includes('/multiple/delete')) {
                        const { ids } = req.body

                        await deleteChecker({
                            modelArr,
                            foreignField,
                            id: ids,
                            isMultiple: true
                        })
                    }
                    else {
                        const { _id } = req.params

                        await deleteChecker({
                            modelArr,
                            foreignField,
                            id: _id
                        })
                    }
                }
                else if (_model === 'projectType') {
                    const modelArr = [ 'project' ]
                    const foreignField = 'projectType'

                    if(req.originalUrl.includes('/multiple/delete')) {
                        const { ids } = req.body

                        await deleteChecker({
                            modelArr,
                            foreignField,
                            id: ids,
                            isMultiple: true
                        })
                    }
                    else {
                        const { _id } = req.params

                        await deleteChecker({
                            modelArr,
                            foreignField,
                            id: _id
                        })
                    }
                }
                else if (_model === 'itemType') {
                    const _ids = req.originalUrl.includes('/multiple/delete') ? req.body.ids : [ req.params._id ]
                    const mappedItemType = await models[`${_model}`].aggregate([
                        {
                            $match: {
                                _status: {
                                    $ne: 'deleted'
                                },
                                _id: {
                                    $in: _ids
                                }
                            }
                        },
                        ...validateMappedRecords(
                            'name',
                            'itemType',
                            [
                                {
                                    document: 'lineitembudgets',
                                    itemsField: 'budgets'
                                },
                                {
                                    document: 'actualexpenses',
                                    itemsField: 'expenses'
                                },
                                {
                                    document: 'finances',
                                    itemsField: 'obligatedItem'
                                }
                            ]
                        ),
                        {
                            $match: {
                                hasRelatedData: true
                            }
                        }
                    ])
                    if (mappedItemType.length) {
                        throw new Error(_ids.length > 1 
                            ? 'One or more of the selected Item Type(s) is currently mapped to other document(s)'
                            : 'Selected Item Type is already mapped to other document(s).')
                    }
                }
            }
            next()
        }
        catch (err) {
            next(new RequestError(400, err.message))
        }
    },
    canUploadAttachment: async (req, res, next) => {
        try {
            const { _model, _id, _fieldName, _index } = req.params
            const model = models[`${_model}`]

            if (!model) {
                throw new Error(`Model ${_model} not found.`)
            }

            let { user: userId } = req.session
            userId = userId ? userId : req.user
            const id = userId

            const userModel = models.user
            const userDoc = await userModel.findById(sanitize(id))

            if (!userDoc) {
                throw new Error('User not found.')
            }

            let doc = null

            // special case for documents that are not created in FE
            if (projectAttachmentModules.includes(_model)) {
                doc = await model.findOne({
                    project: _id
                })
                if (!doc) {
                    doc = await model.create({
                        project: _id
                    })
                }
            }
            else {
                doc = await model.findById(_id)
            }
            if (!doc) {
                throw new Error('Document not found.')
            }

            if (req.session.userID) {
                req.session.oldUserType = req.session.userType
                req.session.oldUserIDValue = req.session.userID.value
                req.session.userType = doc.constructor.modelName
                req.session.userID.value = projectAttachmentModules.includes(_model) ? doc._id : _id
            }

            else {
                req.session.oldUserType = req.userType
                req.session.oldUserIDValue = req.userID.value
                req.session.userType = doc.constructor.modelName
                req.session.userID = {
                    key: 'email',
                    value: projectAttachmentModules.includes(_model) ? doc._id : _id
                }

            }

            if (!model.upload[`${_fieldName}`]) {
                throw new Error('Upload configuration not found.')
            }

            if (model.fileMapping && _index && !model.fileMapping[`${_fieldName}`]) {
                throw new Error(`No file mapping for ${_fieldName}`)
            }

            const { uploadFile } = initializeFiler({
                ...model.upload[`${_fieldName}`],
                __homePath
            })
            const { maxCount } = model.upload[`${_fieldName}`]
            await uploadFile('array')(_fieldName, maxCount)(req, res, next)
        }
        catch (err) {
            next(new RequestError(400, err.message))
        }
    },
    canAccessAttachment: async (req, res, next) => {
        try {
            const { _model, _id } = req.params
            const model = models[`${_model}`]

            let { user } = req.session
            user = user ? user : req.user
            const { userRole } = req.session

            if (!model) {
                throw new Error(`Model ${_model} not found.`)
            }
            const doc = await model.findById(sanitize(_id))

            if (!doc) {
                throw new Error('Document not found.')
            }

            if (userRole.includes('pic')) {
                const obj = _model === 'organizationRegistration' ? {
                    "dataProtectionOfficer.pic": sanitize(user)
                } : {
                    pic: sanitize(user)
                }
                const entry = await model.findOne({
                    _id: sanitize(_id),
                    ...obj
                })
                if (!entry) {
                    throw new Error('Cannot access this document.')
                }
            }
            next()
        }
        catch (err) {
            next(new RequestError(400, err.message))
        }
    }
}