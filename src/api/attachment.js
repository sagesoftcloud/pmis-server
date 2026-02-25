/***
 * File name: attachment.js
 *
 * Description:
 * This file includes the HTTP request paths that are used for
 * managing file attachments.
 *
 * Module Exports:
 * - function: Returns an Express router witn included HTTP request paths for
 * uploading and downloading documents to and from specific database fields.
 */


const { authorize } = require('../config/auth')
const attachment = require('../controllers/attachment')
const { canUploadAttachment, canAccessAttachment } = require('../middlewares/app')

module.exports = (router) => {
    router.route(`/attachment/:_model/:_id/:_fieldName`)
        .post(
            authorize,
            canUploadAttachment,
            attachment.post
        )
    router.route(`/attachment/:_model/:_id/:_fieldName/:_fileName`)
        .get(
            authorize,
            canAccessAttachment,
            attachment.get
        )
        .patch(
            authorize,
            canAccessAttachment,
            attachment.updateOriginalName
        )
        .delete(
            authorize,
            canAccessAttachment,
            attachment.delete
        )

    router.route(`/attachment/:_model/:_id/:_fieldName/:_index`)
        .post(
            authorize,
            canUploadAttachment,
            attachment.post
        )
    router.route(`/attachment/:_model/:_id/:_fieldName/:_index/:_fileName`)
        .get(
            authorize,
            canAccessAttachment,
            attachment.get
        )
        .delete(
            authorize,
            canAccessAttachment,
            attachment.delete
        )
    router.route(`/attachment/:_model/:_id/:_fieldName/:_operate/multiple`)
        .patch(
            authorize,
            canAccessAttachment,
            attachment.multipleOperate
        )
    router.route(`/attachment/:_model/:_id/:_fieldName/:_fileName/:_operate`)
        .patch(
            authorize,
            canAccessAttachment,
            attachment.operate
        )
}