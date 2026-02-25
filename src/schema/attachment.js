/***
 * File name: attachment.js
 * 
 * Description:
 * Structure of attachment for later use of other models.
 * 
 * - Creates a structure that will be part of other model.
 * 
 * Module Exports:
 * - object: Structure of attachment 
 */
const { ObjectId } = require('mongoose').Types

module.exports = {
    fieldname: {
        type: String,
        required: [
            true,
            'Field name is required.' 
        ]
    },
    originalname: {
        type: String,
        required: [
            true,
            'Original name is required.' 
        ]
    },
    encoding: {
        type: String,
        required: [
            true,
            'Encoding is required.' 
        ]
    },
    mimetype: {
        type: String,
        required: [
            true,
            'Mime type is required.' 
        ]
    },
    destination: {
        type: String,
        required: [
            true,
            'Destination filepath is required.' 
        ]
    },
    filename: {
        type: String,
        required: [
            true,
            'File name is required.' 
        ]
    },
    path: {
        type: String,
        required: [
            true,
            'File path is required.' 
        ]
    },
    size: {
        type: Number,
        required: [
            true,
            'File size is required.' 
        ]
    },
    uploadedBy: {
        type: ObjectId,
        ref: 'User',
        immutable: true
    },
    uploadDate: {
        type: Date,
        default: Date.now,
        immutable: true
    },
    linkUrl: {
        type: String
    },
    selfLink: {
        type: String
    },
    uri: {
        type: String
    },
    bucket: {
        type: String
    }
}