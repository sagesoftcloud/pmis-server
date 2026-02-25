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
// False positive. Path is not given by the user.
/* eslint-disable security/detect-non-literal-fs-filename */
const sanitize = require('mongo-sanitize')
const models = require('../models')
const { setValueInFieldOfNestedObject, getValueInFieldfOfNestedObject, setValueInArrayInNestedObject, getValueInArrayInNestedObject, unlinkFileFromFilePath, modelExists } = require('../lib/utils')
const fs = require('fs').promises
const _ = require('lodash')
const sharp = require('sharp')
const { Types } = require('mongoose')
const { ObjectId } = Types
const moment = require('moment')

const archiveFilesFieldName = 'archivedFiles'

const operateAttachment = ({ doc, attachment, _fieldName, _fileName, _operate, mode, fileId }) => {
    const itemField = _fileName ? 'filename' : '_id'
    const paramToCheck = _fileName ? _fileName : fileId
    const tempFileStorage = []
    if (_operate === 'archive') {
        if (mode === 'array') {
            for(const item of doc[`${_fieldName}`]) {
                if (item[`${itemField}`].toString() === paramToCheck.toString()) {
                    doc[`${archiveFilesFieldName}`].push(item)
                }
                else {
                    tempFileStorage.push(item)
                }
            }
            doc[`${_fieldName}`] = tempFileStorage
        }
        else {
            doc[`${archiveFilesFieldName}`].push(attachment)
            doc[`${_fieldName}`] = {
            }
        }
    }
    else if (_operate === 'activate') {
        for (const item of doc[`${archiveFilesFieldName}`]) {
            if (item.fieldname === _fieldName && item[`${itemField}`].toString() === paramToCheck.toString()) {
                const itemSplit = item.originalname.split('.')
                let rootname = itemSplit.shift()
                rootname = rootname.split(' ')
                    .filter((word) => !word.includes('Recovered_'))
                    .join(' ')
                const fileType = itemSplit.pop()
                item.originalname = `${rootname} Recovered_${moment(new Date()).format('YYYYMMDDhhmmss')}.${fileType}`

                if (mode === 'array') {
                    doc[`${_fieldName}`].push(item)
                }
                else {
                    doc[`${_fieldName}`] = item
                }
            }
            else {
                tempFileStorage.push(item)
            }
        }
        doc[`${archiveFilesFieldName}`] = tempFileStorage
    }
}

const renameValidation = ({ currentFiles, _fileName, newOriginalName }) => {
    let result = ''

    if (!currentFiles) {
        throw new Error('Field not found.')
    }

    // Check if array and has value in it
    if (Array.isArray(currentFiles) && !currentFiles.length) {
        throw new Error('No files found.')
    }

    // Check if object and has value in it
    if (currentFiles.constructor === Object && !Object.keys(currentFiles).length) {
        throw new Error('No file found.')
    }

    // if array
    if (Array.isArray(currentFiles)) {
        if (!currentFiles.some((obj) => obj.filename === _fileName)) {
            throw new Error('File not found.')
        }
        if (currentFiles.some((obj) => obj.originalname === newOriginalName)) {
            throw new Error('File name already exist.')
        }
        result = currentFiles.map((obj) => {
            if (obj.filename === _fileName) {
                return {
                    ...obj,
                    originalname: newOriginalName
                }
            }
            return obj
        })
        return result
    }

    // if object
    if (currentFiles['originalname'] !== _fileName) {
        throw new Error('File not found')
    }
    if (currentFiles['originalname'] === newOriginalName) {
        throw new Error('File name already exist.')
    }
    result = {
        ...currentFiles,
        originalname: newOriginalName
    }

    return result
}

const formatSameFileName = (currentFiles, files, _model) => {
    const result = files
    const fileNames = {
    }
    for (const obj of currentFiles) {
        fileNames[`${obj.originalname}`] = Object.prototype.hasOwnProperty.call(fileNames, obj.originalname) ? fileNames[`${obj.originalname}`] + 1 : 1
    }
    for (const obj of result) {
        if (Object.prototype.hasOwnProperty.call(fileNames, obj.originalname)) {
            if(_model) {
                throw new Error('Existing file name.')
            }
            const fileOriginalName = obj.originalname
            const lastIndexOfDot = fileOriginalName.lastIndexOf('.')

            // sample value = myfile(1).pdf
            let formattedFileName = `${fileOriginalName.slice(0, lastIndexOfDot)}(${fileNames[`${obj.originalname}`]})${fileOriginalName.slice(lastIndexOfDot)}`
            let count = fileNames[`${obj.originalname}`]

            while(Object.prototype.hasOwnProperty.call(fileNames, formattedFileName)) {
                count += 1
                formattedFileName = `${fileOriginalName.slice(0, lastIndexOfDot)}(${count})${fileOriginalName.slice(lastIndexOfDot)}`
            }
            obj.originalname = formattedFileName
            fileNames[`${formattedFileName}`] += 1
        }
        else {
            fileNames[`${obj.originalname}`] = 1
        }
    }
    return result
}

const projectAttachmentModules = [ 'cashManagement' ]

const attachmentService = {
    post: async ({ _id, _model, _fieldName, _index, user, reqFiles }) => {
        const model = models[`${_model}`]

        let doc = null
        if (projectAttachmentModules.includes(_model)) {
            doc = await model.findOne({
                project: sanitize(_id)
            })
            if (!doc) {
                doc = await model.create({
                    project: _id
                })
            }
            // eslint-disable-next-line no-param-reassign
            _id = doc._id
        }
        else {
            doc = await model.findById(sanitize(_id))
        }

        const createdByDoc = await models.user.findById(user)

        const fileNamesCommaSeparated = reqFiles.map((item) => item.originalname).join(', ')
        const description = `Uploaded file(s): ${fileNamesCommaSeparated}.`

        doc._revision = {
            author: {
                userModel: models.user.constructor.modelName,
                doc: new ObjectId(createdByDoc._id)
            },
            description
        }

        const currentFiles = doc[`${_fieldName}`]

        const maxCount = model.upload[`${_fieldName}`].maxCount
        let files = maxCount === 1 ? reqFiles[0] : reqFiles
        if(Array.isArray(files)) {
            files = files.map((file) => ({
                ...file,
                uploadedBy: user,
                uploadDate: new Date()
            }))
        }
        else {
            files = {
                ...files,
                uploadedBy: user,
                uploadDate: new Date()
            }
        }

        if (model.fileMapping && model.fileMapping[`${_fieldName}`]) {
            if (_index) {
                const fileMapping = [ ...model.fileMapping[`${_fieldName}`] ]
                const fieldName = fileMapping.pop()
                const updatedDoc = setValueInArrayInNestedObject(doc, fileMapping, files, Number(_index), fieldName)
                doc = _.merge(doc, updatedDoc)
            }
            else {
                const updatedDoc = setValueInFieldOfNestedObject(doc, model.fileMapping[`${_fieldName}`], files)
                doc = Object.assign(doc, updatedDoc)
            }

        }
        else if (Array.isArray(currentFiles) && maxCount !== 1) {
            if(_model === 'projectTask') {
                files = formatSameFileName(currentFiles, files, _model)
            }
            else {
                files = formatSameFileName(currentFiles, files)
            }
            doc[`${_fieldName}`] = [
                ...currentFiles,
                ...files
            ]
        }
        else {
            await unlinkFileFromFilePath(currentFiles, (err) => {
                if (err) {
                    throw new Error(err)
                }
            })
            doc[`${_fieldName}`] = files
        }

        doc.isAttachment = true
        doc.fieldname = _fieldName

        await doc.save()

        const entry = await model.findById(sanitize(_id))

        return {
            entry
        }

    },
    get: async ({
        _id, filename,
        _fieldName, _model,
        _index, parse,
        dimensions, quality, storage,
        user
    }) => {
        const model = models[`${_model}`]
        const doc = await model.findById(sanitize(_id))

        let attachment = doc[`${_fieldName}`]
        if (model.fileMapping && model.fileMapping[`${_fieldName}`]) {
            const fileMapping = [ ...model.fileMapping[`${_fieldName}`] ]
            if (_index) {
                const fieldInArray = fileMapping.pop()
                attachment = getValueInArrayInNestedObject(doc, fileMapping, fieldInArray, _index)
            }
            else {
                attachment = getValueInFieldfOfNestedObject(doc, fileMapping)
            }
        }
        if (Array.isArray(attachment)) {
            if (attachment.length === 0) {
                throw new Error('File not found.')
            }
            attachment = attachment.find((document) => document.filename === filename)
        }

        if ((!attachment || !Object.keys(attachment).length) && !Array.isArray(attachment)) {
            throw new Error('File not found.')
        }

        const { path, mimetype, originalname } = attachment

        const getByDoc = await models.user.findById(user)
        
        if (_fieldName !== 'profilePicture') {
            doc._revision = {
                author: {
                    userModel: models.user.constructor.modelName,
                    doc: new ObjectId(getByDoc._id)
                },
                description: `Downloaded ${originalname}.`
            }
        }
        
        doc.isAttachment = true

        let data = null
        if (storage) {
            const downloadIntoMemory = async () => {
                const fileName = `${attachment.destination}${attachment.filename}`
                const contents = await storage.bucket(attachment.bucket).file(fileName)
                    .download();
                return contents
            }
            const [ fileArrayBuffer ] = await downloadIntoMemory()

            data = fileArrayBuffer
        }
        else {
            data = await fs.readFile(path)
        }

        let dimensionValues = []
        if(dimensions) {
            if(!dimensions.includes('x')) {
                throw new Error('Invalid dimensions.')
            }
            dimensionValues = dimensions.split('x')
            if(dimensionValues.length > 2) {
                throw new Error('Invalid Dimensions')
            }
        }

        if (parse === 'true') {
            let base64String = ''
            const imageMimeTypes = [
                "image/jpeg",
                "image/png"
            ]
            if(imageMimeTypes.includes(mimetype)) {
                let compressedImg = ''
                if(mimetype === 'image/png') {
                    compressedImg = sharp(data)
                        .png({
                            adaptiveFiltering: true,
                            effort: 1,
                            compressionLevel: 9,
                            quality: parseInt(quality, 10)
                        })
                }

                else if (mimetype === 'image/jpeg') {
                    compressedImg = sharp(data)
                        .jpeg({
                            quality: parseInt(quality, 10)
                        })
                }

                if(dimensionValues.length) {
                    const [
                        x,
                        y
                    ] = dimensionValues
                    compressedImg = compressedImg
                        .resize(parseInt(x, 10), parseInt(y, 10))
                }

                const bufferedImg = await compressedImg.toBuffer()

                base64String = `data:${mimetype};base64,${bufferedImg.toString('base64')}`
            }

            else {
                base64String = `data:${mimetype};base64,${Buffer.from(data).toString('base64')}`
            }

            await doc.save()

            return {
                file: base64String,
                _id
            }
        }

        await doc.save()

        return {
            file: data,
            _id
        }


    },
    operate: async ({
        _id,
        filename,
        _fieldName,
        _model,
        _index,
        _operate
    }) => {
        const model = models[`${_model}`]

        let doc = await model.findById(sanitize(_id))

        if (!doc) {
            throw new Error('Document does not exist.')
        }

        if(!doc[`${archiveFilesFieldName}`]) {
            doc[`${archiveFilesFieldName}`] = []
        }

        if (_operate === 'activate' && !doc[`${archiveFilesFieldName}`].filter((item) => item.fieldname === _fieldName && item.filename === filename).length) {
            throw new Error('Archived file does not exist.')
        }

        let attachment = doc[`${_fieldName}`]
        if (model.fileMapping && model.fileMapping[`${_fieldName}`]) {
            const fileMapping = [ ...model.fileMapping[`${_fieldName}`] ]
            if (_index) {
                const fieldInArray = fileMapping.pop()
                attachment = getValueInArrayInNestedObject(doc, fileMapping, fieldInArray, _index)
            }
            else {
                attachment = getValueInFieldfOfNestedObject(doc, fileMapping)
            }
        }

        if (_operate !== 'activate' && Array.isArray(attachment)) {
            if (attachment.length === 0) {
                throw new Error('File not found.')
            }
            attachment = attachment.find((document) => document.filename === filename)
        }

        if (_operate !== 'activate' && !attachment && !Array.isArray(attachment)) {
            throw new Error('File not found.')
        }

        if (model.fileMapping && model.fileMapping[`${_fieldName}`]) {
            if (_index) {
                const fileMapping = [ ...model.fileMapping[`${_fieldName}`] ]
                const fieldName = fileMapping.pop()
                const updatedDoc = setValueInArrayInNestedObject(doc, fileMapping, {
                }, Number(_index), fieldName)
                doc = _.merge(doc, updatedDoc)
            }
            else {
                const updatedDoc = setValueInFieldOfNestedObject(doc, model.fileMapping[`${_fieldName}`], {
                })
                doc = Object.assign(doc, updatedDoc)
            }
        }
        else if (Array.isArray(doc[`${_fieldName}`])) {
            operateAttachment({
                doc,
                attachment,
                _fieldName,
                _fileName: filename,
                _operate,
                mode: 'array'
            })
        }
        else {
            operateAttachment({
                doc,
                attachment,
                _fieldName,
                _fileName: filename,
                _operate,
                mode: 'object'
            })
        }

        doc.isAttachment = true
        doc.fieldname = `delete_${_fieldName}`
        await doc.save()

        return {
            message: `File has been successfully ${_operate}d from the database.`
        }
    },
    handleProjectMultipleOperate: async ({ _id, _fieldName, _operate, fileIds, user }) => {
        const project = await models.project.findById(_id)
        const { tasks } = project
        const updaterDoc = await models.user.findById(user)

        let errorMessage = ''
        const matchedList = []

        for await (const taskId of tasks) {
            const model = models.projectTask
            const doc = await model.findById(sanitize(taskId))
            if (!doc) {
                errorMessage = 'Project task does not exist.'
            }

            for (const fileId of fileIds) {
                if (_operate === 'activate') {
                    const inArchives = doc[`${archiveFilesFieldName}`].filter((item) => item.fieldname === _fieldName && item._id.toString() === fileId.toString()).length
                    if(inArchives) {
                        matchedList.push(fileId)
                    }
                }

                else if (_operate === 'archive') {
                    let attachment = doc[`${_fieldName}`]

                    if (attachment && Array.isArray(attachment)) {
                        attachment = attachment.find((document) => document._id.toString() === fileId.toString())
                    }

                    if(attachment) {
                        matchedList.push(fileId)
                    }
                }
            }
        }

        if(errorMessage) {
            throw new Error(errorMessage)
        }

        if(matchedList.length !== fileIds.length) {
            errorMessage = _operate === 'activate' ? 'File not found.' : 'Archived file does not exist.'
            throw new Error(errorMessage)
        }

        tasks.map(async (taskId) => {
            const model = models.projectTask

            const doc = await model.findById(sanitize(taskId))

            if(!doc[`${archiveFilesFieldName}`]) {
                doc[`${archiveFilesFieldName}`] = []
            }

            const results = fileIds.map((fileId) => {
                let attachment = doc[`${_operate === 'activate' ? archiveFilesFieldName : _fieldName}`]                
               
                attachment = attachment.find((document) => document._id.toString() === fileId.toString())
                
                return {
                    attachment,
                    fileId
                }
            })

            for (const result of results) {
                if (Array.isArray(doc[`${_fieldName}`])) {
                    operateAttachment({
                        doc,
                        attachment: result.attachment,
                        _fieldName,
                        fileId: result.fileId,
                        _operate,
                        mode: 'array'
                    })
                }
                else {
                    operateAttachment({
                        doc,
                        attachment: result.attachment,
                        _fieldName,
                        fileId: result.fileId,
                        _operate,
                        mode: 'object'
                    })
                }
            }

            doc.isAttachment = true
            doc.fieldname = `delete_${_fieldName}`

            const revisionAction = _operate === 'activate' ? 'Recovered' : 'Archived'

            const originalnamesCommaSeparated = results.map((result) => result.attachment.originalname).join(', ')

            doc._revision = {
                author: {
                    userModel: models.user.constructor.modelName,
                    doc: new ObjectId(updaterDoc._id)
                },
                description: `${revisionAction} file(s): ${originalnamesCommaSeparated}.`
            }

            await doc.save()
        })

        return {
            message: `Files have been successfully ${_operate}d from the database.`
        }
    },
    multipleOperateTaggedDocuments: async ({ _fieldName, _operate, taggedDocuments }) => {
        const validTaggedDocuments = taggedDocuments
            .filter((taggedDocument) => taggedDocument.filename && taggedDocument.model && taggedDocument.documentId)

        if (taggedDocuments.length !== validTaggedDocuments.length) {
            throw new Error('Invalid taggedDocuments sent.')
        }

        const checkFiles = async (files) => {
            for await (const item of files) {
                const model = models[`${item.model}`]
                const doc = await model.findById(sanitize(item.documentId))

                const results = attachmentService.validateFileNames({
                    _id: item.documentId,
                    _fieldName,
                    _model: item.model,
                    _operate,
                    fileNames: [ item.filename ],
                    doc
                })

                item.doc = doc
                item.results = results
            }

            return files
        }

        const processFiles = async (files) => {
            for await (const item of files) {
                await attachmentService.multipleOperate({
                    _operate,
                    fileNames: [ item.filename ],
                    doc: item.doc,
                    results: item.results
                })
            }

            return files
        }

        const accountingFiles = taggedDocuments.filter((taggedDocument) => taggedDocument.model === 'accountingManagement')
        const budgetFiles = taggedDocuments.filter((taggedDocument) => taggedDocument.model === 'budgetManagement')
        const cashFiles = taggedDocuments.filter((taggedDocument) => taggedDocument.model === 'cashManagement')

        const checkPromises = [
            () => checkFiles(accountingFiles),
            () => checkFiles(budgetFiles),
            () => checkFiles(cashFiles)
        ]

        const checkResults = await Promise.all(checkPromises.map((checks) => checks()))

        const finalPromises = checkResults.map((result) => () => processFiles(result))

        await Promise.all(finalPromises.map((promise) => promise()))

        return {
            message: `Files have been successfully ${_operate}d from the database.`
        }
    },
    validateFileNames: ({ _id, _fieldName, _model, _operate, fileNames, doc }) => fileNames.map((_fileName) => {
        if (_operate === 'activate' && !doc[`${archiveFilesFieldName}`].filter((item) => item.fieldname === _fieldName && item.filename === _fileName).length) {
            throw new Error('Archived file does not exist.')
        }

        let attachment = doc[`${_fieldName}`]

        if (_operate !== 'activate' && Array.isArray(attachment)) {
            if (attachment.length === 0) {
                throw new Error('File not found.')
            }
            attachment = attachment.find((item) => item.filename === _fileName)
        }

        if (_operate !== 'activate' && !attachment && !Array.isArray(attachment)) {
            throw new Error('File not found.')
        }

        return {
            _id,
            filename: _fileName,
            _fieldName,
            _model,
            _operate
        }

    }),
    multipleOperate: async ({ _operate, fileNames, doc, results }) => {
        if (!fileNames || !fileNames.length) {
            throw new Error('fileNames are required.')
        }

        if(!doc[`${archiveFilesFieldName}`]) {
            doc[`${archiveFilesFieldName}`] = []
        }

        for await (const result of results) {
            await attachmentService.operate(result)
        }

        return {
            message: `Files have been successfully ${_operate}d from the database.`
        }
    },
    delete: async ({ _id, _fileName, _fieldName, _model, _index, user }) => {
        const model = models[`${_model}`]

        let doc = await model.findById(sanitize(_id))

        let attachment = doc[`${_fieldName}`]
        if (model.fileMapping && model.fileMapping[`${_fieldName}`]) {
            const fileMapping = [ ...model.fileMapping[`${_fieldName}`] ]
            if (_index) {
                const fieldInArray = fileMapping.pop()
                attachment = getValueInArrayInNestedObject(doc, fileMapping, fieldInArray, _index)
            }
            else {
                attachment = getValueInFieldfOfNestedObject(doc, fileMapping)
            }
        }

        if (Array.isArray(attachment)) {
            if (attachment.length === 0) {
                throw new Error('File not found.')
            }
            attachment = attachment.find((document) => document.filename === _fileName)
        }
        if (!attachment && !Array.isArray(attachment)) {
            throw new Error('File not found.')
        }

        if (model.fileMapping && model.fileMapping[`${_fieldName}`]) {
            if (_index) {
                const fileMapping = [ ...model.fileMapping[`${_fieldName}`] ]
                const fieldName = fileMapping.pop()
                const updatedDoc = setValueInArrayInNestedObject(doc, fileMapping, {
                }, Number(_index), fieldName)
                doc = _.merge(doc, updatedDoc)
            }
            else {
                const updatedDoc = setValueInFieldOfNestedObject(doc, model.fileMapping[`${_fieldName}`], {
                })
                doc = Object.assign(doc, updatedDoc)
            }

        }
        else if (Array.isArray(doc[`${_fieldName}`])) {
            const tempFileStorage = []
            for(const item of doc[`${_fieldName}`]) {
                if (item.filename !== _fileName) {
                    tempFileStorage.push(item)
                }
            }
            doc[`${_fieldName}`] = tempFileStorage
        }
        else {
            doc[`${_fieldName}`] = {
            }
        }
        await unlinkFileFromFilePath(attachment, (err) => {
            if (err) {
                throw new Error(err)
            }
        })

        const updaterDoc = await models.user.findById(user)

        doc._revision = {
            author: {
                userModel: models.user.constructor.modelName,
                doc: new ObjectId(updaterDoc._id)
            },
            description: `Deleted file: ${_fileName}.`
        }

        doc.isAttachment = true
        doc.fieldName = `delete_${_fieldName}`
        await doc.save()

        return {
            message: `${attachment.originalname} of ${_fieldName} has been successfully deleted from the database.`
        }
    },
    updateOriginalName: async ({ _id, _fileName, _fieldName, _model, newOriginalName, user }) => {
        const model = modelExists(models, _model)

        const doc = await model.findById(sanitize(_id))
        if (!doc) {
            throw new Error('Document does not exist.')
        }

        const currentFiles = doc[`${_fieldName}`]

        const result = renameValidation({
            currentFiles: JSON.parse(JSON.stringify(currentFiles)),
            _fileName,
            newOriginalName
        })

        doc[`${_fieldName}`] = result
        doc._revision = {
            author: {
                userModel: models.user.constructor.modelName,
                doc: new ObjectId(user)
            },
            description: `${_fileName} has been renamed to ${newOriginalName}.`
        }
        await doc.save()

        return {
            message: `Attachment has been successfully renamed.`
        }
    }
}

module.exports = attachmentService