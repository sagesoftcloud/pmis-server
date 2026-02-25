const { formatQuery } = require("../lib/utils")
const history = require('../models/history')

module.exports = {
    view: async ({ params, query, session }) => {
        const { _model, _id } = params

        let customQuery = {
        }

        let pipeline = []

        const {
            key = null,
            value = null,
            advancedQuery,
            start = 0,
            count = 999999,
            sortBy = 'dateCreated',
            secondSortBy = '_id',
            asc = 1,
            total = false,
            dataview = 'default',
            search
        } = query

        let dataViewQuery = history.dataView[`${dataview}`] || []
        if (typeof history.dataView[`${dataview}`] === 'function') {
            dataViewQuery = await history.dataView[`${dataview}`](session, query)
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
                    model: _model,
                    modelId: _id
                }
            },
            ...pipeline
        ]

        if (search) {
            const defaultSearch = history.search ? history.search[`${dataview}`](search) : []
            pipeline = pipeline.concat([ ...defaultSearch ])
        }

        const entries = await history.aggregate([
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
        const allEntries = await history.aggregate(pipeline)

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