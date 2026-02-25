/* eslint-disable new-cap */
const { RequestError } = require('error-handler')
const reportService = require('../services/report')

module.exports = {
    create: (reportName) => async (req, res, next) => {
        try {
            let { user } = req.session
            const { userRole } = req.session
            user = user ? user : req.user

            const newEntry = await reportService.create({
                user,
                userRole,
                reportName,
                body: req.body
            })

            res.status(200).json(newEntry)
        }
        catch (error) {
            let { message } = error
            if (message === `Cannot set property '_original' of null`) {
                //Message occurs when `postSave` updates invalid parameters
                message = `Error generating reports: Invalid Parameters`
            }
            next(new RequestError(400, message))
        }
    },
    viewAll: (reportName) => async (req, res, next) => {
        try {
            const allReports = await reportService.viewAll(reportName)

            res.status(200).json(allReports)
        }
        catch (error) {
            next(new RequestError(400, error.message))
        }
    },
    view: async (req, res, next) => {
        try {
            const { _id } = req.params
            const { session } = req

            const report = await reportService.view(_id, session)

            res.status(200).json(report)
        }
        catch (error) {
            next(new RequestError(400, error.message))
        }
    }
}