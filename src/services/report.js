/* eslint-disable new-cap */
const { connection, Types } = require('mongoose')
const { ObjectId } = Types
const reports = require('../reports')

const moment = require('moment')

const removeEmptyParameter = (parameters) => {
    for (const item in parameters) {
        if(!parameters[`${item}`]) {
            delete parameters[`${item}`]
        }

        else if(Array.isArray(parameters[`${item}`]) && !parameters[`${item}`].length) {
            delete parameters[`${item}`]
        }
    }

    return parameters
}

module.exports = {
    create: async ({ user, userRole, reportName, body }) => {
        const { Report, User } = connection.models

        const createdByDoc = await User.findById(user)
        const runPipeline = reports[`${reportName}`]

        let parameters = body

        // remove parameter if empty
        parameters = removeEmptyParameter(parameters)

        if (reportName === 'auditLogs' && (!parameters.dateFrom || !parameters.dateTo)) {
            throw new Error('"Date from" and "Date to" is required.')
        }

        const start = moment(parameters.dateFrom, [
            "MM/DD/YYYY",
            "MM-DD-YYYY",
            "DD/MM/YYYY",
            "DD-MM-YYYY",
            "YYYY-MM-DD",
            "YYYY/MM/DD"
        ]).startOf('day')
            .toDate()
        const end = parameters.dateTo ? moment(parameters.dateTo, [
            "MM/DD/YYYY",
            "MM-DD-YYYY",
            "DD/MM/YYYY",
            "DD-MM-YYYY",
            "YYYY-MM-DD",
            "YYYY/MM/DD"
        ]).endOf('day')
            .toDate() : moment(start).endOf('day')
            .toDate()

        const formattedParams = {
            ...parameters,
            user,
            dateFrom: start,
            dateTo: end
        }

        if (reportName === 'auditLogs') {
            const { dateFrom, dateTo } = formattedParams

            if (moment(dateTo).diff(moment(dateFrom), "days") > 7) {
                throw new Error("Auditlogs can only be generated for one (1) week's worth of data at most.")
            }
        }

        if (!runPipeline) {
            throw new Error('No such report found.')
        }

        let pipeline = []
        // Check if runPipeline is async function
        if (runPipeline.constructor.name === "AsyncFunction") {
            pipeline = await runPipeline(formattedParams)
        }
        else {
            pipeline = runPipeline(formattedParams)
        }

        const entry = await Report.create({
            name: reportName,
            author: user,
            parameters,
            createdBy: ObjectId(createdByDoc._id),
            updatedBy: ObjectId(createdByDoc._id),
            _revision: {
                author: {
                    userModel: User.constructor.modelName,
                    doc: ObjectId(createdByDoc._id),
                    userRole: userRole
                },
                description: `Created a report by ${createdByDoc.firstName} ${createdByDoc.middleName ? `${createdByDoc.middleName}` : ''} ${createdByDoc.lastName}.`
            }
        })

        pipeline = [
            {
                $match: {
                    _id: entry._id
                }
            },
            ...pipeline
        ]

        const result = await Report.aggregate(pipeline)
            .allowDiskUse(true)

        const newEntry = {
            reportName: reportName,
            parameters: entry.parameters,
            result
        }

        return newEntry

    },
    viewAll: async (reportName) => {
        const { Report } = connection.models

        const allReports = await Report.find()

        return {
            reportName,
            result: allReports
        }
    },
    view: async (_id, session) => {
        const { Report } = connection.models

        let report = await Report.aggregate([
            {
                $match: {
                    _id: _id
                }
            }
        ])

        // eslint-disable-next-line prefer-destructuring
        report = report[0]

        if (!report) {
            throw new Error('No such report exists.')
        }

        let { parameters } = report
        const { modifyInfo } = Report

        if (modifyInfo) {
            parameters = modifyInfo(parameters, session)
        }

        let pipeline = reports[report.name]
        if (pipeline.constructor.name === "AsyncFunction") {
            pipeline = await reports[report.name](parameters)
        }
        else {
            pipeline = reports[report.name](parameters)
        }

        pipeline = [
            {
                $match: {
                    _id: report._id
                }
            },
            ...pipeline
        ]

        let result = await Report
            .aggregate(pipeline)
        // eslint-disable-next-line prefer-destructuring
        result = result[0]

        return {
            reportName: report.name,
            dateGenerated: report.dateGenerated,
            result
        }
    }
}