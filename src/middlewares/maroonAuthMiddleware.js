/* eslint-disable no-mixed-operators */
/* eslint-disable no-unused-vars */
/* eslint-disable require-await */
const { connection } = require('mongoose')
const { changePasswordRegex } = require('../config/meta')
const { RequestError } = require('error-handler')
const { ObjectId } = require('mongoose').Types
const sanitize = require('mongo-sanitize')
const { formatQuery } = require('../lib/utils')

const ids = {
}

const miliSecToSec = (number) => number * 1000
const seconds = 180
const calculateDiff = (number) => (seconds - (Date.now() - number) / 1000).toFixed(0)

const handleGetRequest = async (req, res, next) => {
    if(req.originalUrl.includes('/admin/users')) {
        const { dataview } = req.query
        const { userRole } = req.session

        const isAllowed = userRole.includes('admin') || userRole.includes('superadmin')

        if(dataview !== 'projectUsers' && !isAllowed) {
            next(new RequestError(403, 'Authorization error: Only IT Admin and Super Admin can view all users.'))
        }

        if (!userRole.includes('superadmin') && dataview !== 'supervisors') {
            if (req.query.advancedQuery) {
                const decodedURI = formatQuery(JSON
                    .parse(decodeURIComponent(req.query.advancedQuery)))
                const newAdvancedQuery = {
                    ...decodedURI,
                    userRole: {
                        $ne: 'superadmin'
                    }
                }

                req.query.advancedQuery = encodeURIComponent(JSON.stringify(newAdvancedQuery))
            }

            else {
                const newAdvancedQuery = {
                    userRole: {
                        $ne: 'superadmin'
                    }
                }

                req.query.advancedQuery = encodeURIComponent(JSON.stringify(newAdvancedQuery))
            }
        }

    }

    else if(req.originalUrl.includes('/user/account/logout')) {
        const { Authentication } = connection.models
        const { user: userId } = req.session

        if(userId) {
            const authDoc = await Authentication.findOne({
                userDocument: sanitize(userId)
            })

            Object.assign(authDoc, {
                _revision: {
                    author: {
                        userModel: 'User',
                        doc: userId
                    },
                    description: 'User logged out.'
                }
            })

            await authDoc.save()
        }
    }
}

const handlePostRequest = async (req, res, next) => {
    if(req.originalUrl.includes('/user/password/generatebackupcodes')) {
        const { username } = req.session
        const { username: usernameFromBody } = req.body

        if (username !== usernameFromBody) {
            next(new RequestError(403, 'Authorization error: Cannot generate backup code for other user.'))
        }
    }

    else if (req.originalUrl.includes('/user/password/forgot')) {
        const { username } = req.body

        if (ids[`${username}`]) {
            next(new RequestError(400, `Need to wait ${calculateDiff(ids[`${username}`])} seconds to generate a link again.`))
        }
        else {
            ids[`${username}`] = Date.now()
            setTimeout(() => {
                delete ids[`${username}`]
            }, miliSecToSec(seconds))
        }
    }

    else if (req.originalUrl.includes('/user/password/change')) {
        const { password } = req.body

        if(!changePasswordRegex.test(password)) {
            next(new RequestError(400, 'Password is invalid.'))
        }
    }

    else if (req.originalUrl.includes(`/admin/user/multiple/delete`)) {
        const { ids: userIds } = req.body
        const { user } = req.session
        if(userIds.length && user && userIds.includes(user.toString())) {
            next(new RequestError(400, 'You cannot delete your own account.'))
        }

        const { Project } = connection.models
        try {
            const userIdsObject = userIds.map((userId) => new ObjectId(userId))
            await Project.deleteUserMappingValidation(userIdsObject)
        }

        catch (error) {
            next(new RequestError(400, error.message))
        }
    }

    else if (req.originalUrl.includes('/admin/users')) {
        const { userRole } = req.session
        const { userRole: userRoleInfo } = req.body.info

        if (!userRole.includes('superadmin') && userRoleInfo === 'superadmin') {
            next(new RequestError(400, 'Only superadmin can create superadmin.'))
        }
    }
}

const handlePatchRequest = async ({ userModel, req, res, next }) => {
    if(req.originalUrl.includes('/user/myprofile')) {
        const { info } = req.body
        const { userRole: infoUserRole, email } = info

        if(infoUserRole) {
            next(new RequestError(400, 'Validation Error: Cannot change user role in user profile.'))
        }

        else if(email) {
            next(new RequestError(400, 'Validation Error: Cannot change email.'))
        }

        const allowedKeys = [
            'mobileNumber',
            'zoom'
        ]

        for(const key in info) {
            if(!allowedKeys.includes(key)) {
                delete info[`${key}`]
            }
        }
    }

    else if(req.originalUrl.includes(`user/${req.params._userRole}/${req.params._id}/delete`)) {
        const { Project } = connection.models
        const docs = await Project.find({
            _status: 'active',
            members: req.params._id
        })

        if (docs.length) {
            next(new Error('The user is currently mapped to a document'))
        }
    }

    else if (req.originalUrl.includes(`/admin/user/profile/${req.params._id}/activate`)) {
        const { _id } = req.params
        const { userRole } = req.session

        const { User } = connection.models
        const { userRole: userRoleInfo } = await User.findById(_id)
        if (!userRole.includes('superadmin')) {
            if (userRoleInfo.includes('superadmin')) {
                next(new Error('Only superadmin can activate a superadmin account.'))
            }
        }
    }

    else if (req.originalUrl.includes(`/admin/user/profile/${req.params._id}/deactivate`)) {
        const { _id } = req.params
        const { user, userRole } = req.session
        if(_id && user && _id.toString() === user.toString()) {
            next(new Error('You cannot deactivate your own account.'))
        }

        const { User } = connection.models
        const { userRole: userRoleInfo } = await User.findById(_id)
        if (!userRole.includes('superadmin')) {
            if (userRoleInfo.includes('superadmin')) {
                next(new Error('Only superadmin can deactivate a superadmin account.'))
            }
        }
    }
}

module.exports = (userModel) => async (req, res, next) => {
    if(req.method === 'GET') {
        await handleGetRequest(req, res, next)
    }

    else if(req.method === "POST") {
        await handlePostRequest(req, res, next)
    }

    else if (req.method === 'PATCH') {
        await handlePatchRequest({
            userModel,
            req,
            res,
            next
        })
    }

    next()
}