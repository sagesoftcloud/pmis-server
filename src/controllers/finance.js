const { RequestError } = require('error-handler')
const { Types } = require('mongoose')
const { ObjectId } = Types
const Project = require('../models/project')
const History = require('../models/history')

const financeService = require('../services/finance')
const userService = require('../services/user')

module.exports = {
    obligate: async (req, res, next) => {
        try {
            const { _id } = req.params
            const { user = req.user } = req.session
            const {
                obligatedItem,
                obligatedAmount
            } = req.body

            if (!obligatedItem?.length) {
                throw new Error('Obligate failed. Obligated Item is required.')
            }

            if (!obligatedAmount) {
                throw new Error('Obligated amount is required.')
            }

            const finance = await financeService.getFinance(_id)

            const userDoc = await userService.getUser(user)

            finance._revision = {
                author: {
                    userModel: 'User',
                    doc: new ObjectId(user)
                },
                description: `Modified Finance document.`
            }

            await financeService.obligate(finance, obligatedItem, obligatedAmount)

            const project = await Project.findById(finance.projectId)

            await History.create({
                model: 'finance',
                modelId: finance._id,
                name: project.title,
                userId: userDoc._id,
                userFullName: `${userDoc.firstName} ${userDoc.lastName}`,
                userProfilePicture: userDoc.profilePicture,
                activities: 'Update Finance Obligate'
            })

            res.status(200).json({
                message: 'Finance obligate has been successfully updated.'
            })
        }
        catch(error) {
            next(new RequestError(400, error.message))
        }
    },
    addDisbursement: async (req, res, next) => {
        try {
            const { _id } = req.params
            const { user = req.user } = req.session
            const { obligatedItem } = req.body

            if (!obligatedItem?.length) {
                throw new Error('Obligated item is required.')
            }

            const finance = await financeService.getFinance(_id)

            const userDoc = await userService.getUser(user)

            finance._revision = {
                author: {
                    userModel: 'User',
                    doc: new ObjectId(user)
                },
                description: `Modified Finance document.`
            }

            await financeService.addDisbursement(finance, obligatedItem)

            const project = await Project.findById(finance.projectId)

            await History.create({
                model: 'finance',
                modelId: finance._id,
                name: project.title,
                userId: userDoc._id,
                userFullName: `${userDoc.firstName} ${userDoc.lastName}`,
                userProfilePicture: userDoc.profilePicture,
                activities: 'Update Finance Disbursement'
            })

            res.status(200).json({
                message: 'Finance disbursement has been successfully updated'
            })
        }
        catch(error) {
            next(new RequestError(400, error.message))
        }
    },
    addChecks: async (req, res, next) => {
        try {
            const { _id } = req.params
            const { user = req.user } = req.session
            const { obligatedItem } = req.body

            if (!obligatedItem?.length) {
                throw new Error('Obligated item is required.')
            }

            const finance = await financeService.getFinance(_id)

            finance._revision = {
                author: {
                    userModel: 'User',
                    doc: new ObjectId(user)
                },
                description: `Modified Finance document.`
            }

            const userDoc = await userService.getUser(user)

            await financeService.addChecks(finance, obligatedItem)

            const project = await Project.findById(finance.projectId)

            await History.create({
                model: 'finance',
                modelId: finance._id,
                name: project.title,
                userId: userDoc._id,
                userFullName: `${userDoc.firstName} ${userDoc.lastName}`,
                userProfilePicture: userDoc.profilePicture,
                activities: 'Set Finance Checks'
            })

            res.status(200).json({
                message: 'Finance checks has been successfully updated'
            })
        }
        catch(error) {
            next(new RequestError(400, error.message))
        }
    },
    setToCompleted: async (req, res, next) => {
        try {
            const { _id } = req.params
            const { user = req.user } = req.session

            const finance = await financeService.getFinance(_id)

            finance._revision = {
                author: {
                    userModel: 'User',
                    doc: new ObjectId(user)
                },
                description: `Modified Finance document.`
            }

            const userDoc = await userService.getUser(user)

            await financeService.setToCompleted(finance)

            const project = await Project.findById(finance.projectId)

            await History.create({
                model: 'finance',
                modelId: finance._id,
                name: project.title,
                userId: userDoc._id,
                userFullName: `${userDoc.firstName} ${userDoc.lastName}`,
                userProfilePicture: userDoc.profilePicture,
                activities: 'Set to Completed Finance'
            })

            res.status(200).json({
                message: 'Finance has been successfully set to completed.'
            })
        }
        catch(error) {
            next(new RequestError(400, error.message))
        }
    },

    restore: async (req, res, next) => {
        try {
            const { _id } = req.params
            const { user = req.user } = req.session

            const finance = await financeService.getFinance(_id)

            finance._revision = {
                author: {
                    userModel: 'User',
                    doc: new ObjectId(user)
                },
                description: `Restored Finance document.`
            }

            const userDoc = await userService.getUser(user)

            await financeService.restore(finance)

            const project = await Project.findById(finance.projectId)

            await History.create({
                model: 'finance',
                modelId: finance._id,
                name: project.title,
                userId: userDoc._id,
                userFullName: `${userDoc.firstName} ${userDoc.lastName}`,
                userProfilePicture: userDoc.profilePicture,
                activities: 'Restored Finance from archives'
            })

            res.status(200).json({
                message: 'Finance has been successfully restored.'
            })
        }
        catch(error) {
            next(new RequestError(400, error.message))
        }
    }
}