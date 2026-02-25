const models = require('../models')
const { formatQuery } = require('../lib/utils')
const { ObjectId } = require('mongoose').Types

const sortAndPaginatePipeline = ({ sortBy, asc, start, count }) => [
    {
        $project: {
            _revision: 0
        }
    },
    {
        $sort: {
            [sortBy]: parseInt(asc, 10) === 1 ? 1 : -1
        }
    },
    {
        $skip: parseInt(start, 10)
    },
    {
        $limit: parseInt(count, 10)
    }
]

module.exports = {
    viewDashboard: async ({ session, query }) => {
        const { project } = models
        let newQuery = {
        }

        let pipeline = []

        const {
            key = null,
            value = null,
            advancedQuery,
            start = 0,
            count = 999999,
            sortBy = '_id',
            asc = 1,
            search
        } = query


        if(key !== null && value !== null) {
            newQuery = {
                [key]: value
            }
        }
        else if(advancedQuery) {
            newQuery = formatQuery(JSON
                .parse(decodeURIComponent(advancedQuery)))
        }
        pipeline = [
            {
                $match: newQuery
            }
        ]

        if (search) {
            const defaultSearch = project.search.dashboard(search)
            pipeline = pipeline.concat([ ...defaultSearch ])
        }

        pipeline = pipeline.concat(sortAndPaginatePipeline({
            sortBy,
            asc,
            start,
            count
        }))


        pipeline = await project.dataView.dashboard(session, pipeline)

        const [ result ] = await project.aggregate(pipeline).allowDiskUse(true)
        const { projects, allProjects, notYetStarted, active, onHold, completed, overdue, suspended, terminated } = result
        // Need to disable line to assign Mongoose data to variable
        // eslint-disable-next-line prefer-destructuring

        return {
            entries: projects,
            allProjects: allProjects ? allProjects.length : 0,
            notYetStarted: notYetStarted ? notYetStarted.length : 0,
            active: active ? active.length : 0,
            onHold: onHold ? onHold.length : 0,
            completed: completed ? completed.length : 0,
            overdue: overdue ? overdue.length : 0,
            suspended: suspended ? suspended.length : 0,
            terminated: terminated ? terminated.length : 0
        }
    },
    viewOverdue: async ({ session, query }) => {
        const { project, projectTask } = models
        const { user } = session
        let newQuery = {
        }

        let pipeline = []

        const {
            key = null,
            value = null,
            advancedQuery,
            start = 0,
            count = 999999,
            sortBy = 'title',
            asc = 1,
            search,
            viewMode = null
        } = query

        if(key !== null && value !== null) {
            newQuery = {
                [key]: value
            }
        }
        else if(advancedQuery) {
            newQuery = formatQuery(JSON
                .parse(decodeURIComponent(advancedQuery)))
        }
        pipeline = [
            {
                $match: newQuery
            }
        ]

        if (search) {
            const defaultSearch = project.search.overdue(search)
            pipeline = pipeline.concat([ ...defaultSearch ])
        }

        const viewModes = [
            'project',
            'task'
        ]

        const totalOverdueProjectsFilter = [
            {
                $or: [
                    {
                        members: new ObjectId(user)
                    },
                    {
                        createdBy: new ObjectId(user)
                    }
                ],
                _status: {
                    $ne: 'deleted'
                },
                status: 'Overdue'
            }
        ]

        const totalOverdueTasksFilter = [
            {
                $or: [
                    {
                        assignTo: new ObjectId(user)
                    },
                    {
                        createdBy: new ObjectId(user)
                    }
                ],
                _status: {
                    $ne: 'deleted'
                },
                status: 'Overdue'
            }
        ]

        const totalOverdueProjects = await project.countDocuments(...totalOverdueProjectsFilter)

        const totalOverdueProjectTasks = await projectTask.countDocuments(...totalOverdueTasksFilter)

        let total = totalOverdueProjects + totalOverdueProjectTasks

        if (viewModes.includes(viewMode)) {
            pipeline = pipeline.concat({
                $match: {
                    model: viewMode
                }
            })

            if (viewMode === 'project') {
                total = totalOverdueProjects
            }

            else if (viewMode === 'task') {
                total = totalOverdueProjectTasks
            }
        }

        pipeline = pipeline.concat(sortAndPaginatePipeline({
            sortBy,
            asc,
            start,
            count
        }))

        pipeline = await project.dataView.overdue(session, pipeline)

        const result = await project.aggregate(pipeline).allowDiskUse(true)

        // Need to disable line to assign Mongoose data to variable
        // eslint-disable-next-line prefer-destructuring

        return {
            total,
            entries: result.length ? result : []
        }
    }
}