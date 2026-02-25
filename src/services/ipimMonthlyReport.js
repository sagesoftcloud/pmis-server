const { getLatestReport, getCumulatedReports } = require("../lib/ipimHelpers")
const ipimMonthlyReportModel = require('../models/ipimMonthlyReport')
const projectModel = require('../models/project')
const lineItemBudgetModel = require('../models/lineItemBudget')
const actualExpensesModel = require('../models/actualExpenses')
const { formatQuery } = require("../lib/utils")

const ipimMonthlyReportService = {
    generate: async ({ params, query }) => {
        const { _projectId } = params
        const { all } = query

        const projectDoc = await projectModel.findById(_projectId)
        const [ budgetDoc ] = await lineItemBudgetModel.find({
            project: _projectId
        })
        const [ actualExpensesDoc ] = await actualExpensesModel.find({
            project: _projectId
        })

        if (all === 'true') {
            return getCumulatedReports(projectDoc, budgetDoc, actualExpensesDoc)
        }

        return getLatestReport(projectDoc, budgetDoc, actualExpensesDoc)
    },
    view: async ({ params, query, session }) => {
        const { _projectId } = params

        let customQuery = {
        }

        let pipeline = []

        const {
            key = null,
            value = null,
            advancedQuery,
            start = 0,
            count = 999999,
            sortBy = 'year',
            secondSortBy = 'month',
            asc = 1,
            total = false,
            dataview = 'default',
            search
        } = query

        let dataViewQuery = ipimMonthlyReportModel.dataView[`${dataview}`] || []
        if (typeof ipimMonthlyReportModel.dataView[`${dataview}`] === 'function') {
            dataViewQuery = await ipimMonthlyReportModel.dataView[`${dataview}`](session, query)
        }

        if(key !== null && value !== null) {
            customQuery = {
                [key]: value
            }
        }
        else if(advancedQuery) {
            customQuery = formatQuery(JSON
                .parse(decodeURIComponent(advancedQuery)))
        }
        pipeline = pipeline
            .concat([
                ...dataViewQuery,
                {
                    $match: customQuery
                }
            ])

        pipeline = [
            {
                $match: {
                    projectId: _projectId
                }
            },
            ...pipeline
        ]

        if (search) {
            const defaultSearch = ipimMonthlyReportModel.search ? ipimMonthlyReportModel.search[`${dataview}`](search) : []
            pipeline = pipeline.concat([ ...defaultSearch ])
        }

        const entries = await ipimMonthlyReportModel.aggregate([
            ...pipeline,
            {
                $project: {
                    _revision: 0
                }
            },
            {
                $sort: {
                    [sortBy]: parseInt(asc, 10) === 1 ? 1 : -1,
                    [secondSortBy]: 1
                }
            },
            {
                $skip: parseInt(start, 10)
            },
            {
                $limit: parseInt(count, 10)
            }

        ]).allowDiskUse(true)
        const allEntries = await ipimMonthlyReportModel.aggregate(pipeline)

        return total
            ? {
                total: allEntries.length
            }
            : {
                entries,
                total: allEntries.length
            }
    }
}

module.exports = ipimMonthlyReportService