/* eslint-disable no-undefined */
/* eslint-disable no-console */
const { CronJob } = require('cron')
const projectModel = require('../models/project')
const projectTaskModel = require('../models/projectTask')
const projectTypeModel = require('../models/projectType')
const financeModel = require('../models/finance')
const { timezone, dateFormat } = require('../config/meta')
const { lookupUnwind } = require('../models/lib/utils')
const { environment } = require('../config')

// helpful cron schedules
// const everyMinute = "* * * * *"
// const midNight = "0 0 * * *"
// const everyFifteenMinutes = "*/15 * * * *"
const everyTwelveHours = "0 */12 * * *"
const at5AMand6PM = '0 5,18 * * *'
const at6PM = '0 18 * * *'
const at12NN = '0 12 * * *'

// logs status change in patches and saves document
const setStatusToOverdue = async (document, name) => {
    if (document) {
        document.status = 'Overdue'
        document._revision = {
            author: {
                userModel: "User",
                doc: null
            },
            description: `System set this ${name}'s status to overdue.`
        }

        await document.save()
    }
}

// cronJob for automatically checking overdue projects and tasks
const overdueStatusJob = new CronJob(everyTwelveHours, async () => {
    console.log(`Checking for overdue projects and tasks.`)

    const overdueAggregation = [
        {
            $match: {
                _status: 'active',
                status: {
                    $in: [
                        'Not Yet Started',
                        'Active',
                        'On Hold'
                    ]
                },
                expectedCompletionDate: {
                    $exists: true
                }
            }
        },
        {
            $match: {
                expectedCompletionDate: {
                    $ne: null
                }
            }
        },
        {
            $addFields: {
                expectedCompletionDate: {
                    $dateToString: {
                        date: '$expectedCompletionDate',
                        timezone,
                        format: dateFormat
                    }
                },
                dateNow: {
                    $dateToString: {
                        date: '$$NOW',
                        timezone,
                        format: dateFormat
                    }
                }
            }
        },
        {
            $match: {
                $expr: {
                    $lt: [
                        '$expectedCompletionDate',
                        '$dateNow'
                    ]
                }
            }
        }
    ]

    const overdueProjects = await projectModel.aggregate(overdueAggregation)
    const overdueProjectTasks = await projectTaskModel.aggregate(overdueAggregation)

    // these two lines of code below were done because we want to use .save() inside setStatusToOverdue()
    const projectsToOverdue = await Promise.all(overdueProjects.map((overdueProject) => projectModel.findById(overdueProject._id)))
    const projectTasksToOverdue = await Promise.all(overdueProjectTasks.map((overdueTask) => projectTaskModel.findById(overdueTask._id)))

    await Promise.all(projectsToOverdue.map((overdueProject) => setStatusToOverdue(overdueProject, 'project')))
    await Promise.all(projectTasksToOverdue.map((overdueTask) => setStatusToOverdue(overdueTask, 'task')))

    console.log('Overdue status cron job done.')
}, null, true, timezone)

// use .save() on suspended projects to update their suspensionTime in IPIM monthly report
// the .post('save') in project model handles the update
const updateIPIMOfSuspendedProjects = new CronJob(at5AMand6PM, async () => {
    const [ projectType ] = await projectTypeModel.find({
        isBOQ: true
    })

    if (projectType) {
        const { _id: projectTypeId } = projectType

        console.log('Project Monthly Status Check CRON job is running.')

        const projectDocs = await projectModel.find({
            projectType: projectTypeId,
            status: "Suspended"
        })

        await Promise.all(projectDocs.map((projectDoc) => {
            // this will skip pre-save hook
            projectDoc.isCron = true

            return projectDoc.save()
        }))

        console.log('Project Monthly Status Check CRON job done.')
    }
})

let archiveSchedule = at6PM
if (environment === 'development') {
    archiveSchedule = at12NN
}
// Archive finances once the project has reached a one-year milestone after its completion.
const archiveFinance = new CronJob(archiveSchedule, async () => {
    console.log('Archiving finance with projects that has reached one-year milestone after its completion.')
    const financesToArchive = await projectModel.aggregate([
        {
            $match: {
                _status: 'active'
            }
        },
        ...lookupUnwind({
            from: 'finances',
            localField: 'finance',
            as: 'finance'
        }),
        {
            $match: {
                "finance._status": 'active'
            }
        },
        {
            $addFields: {
                differenceMilli: {
                    $subtract: [
                        "$$NOW",
                        {
                            $cond: [
                                {
                                    $ifNull: [
                                        '$finance.restoredAt',
                                        false
                                    ]
                                },
                                '$finance.restoredAt',
                                '$actualCompletionDate'
                            ]
                        }
                    ]
                }
            }
        },
        {
            $match: {
                differenceMilli: {
                    $gt: 31556952000
                }
            }
        },
        {
            $project: {
                _id: "$finance._id"
            }
        }
    ])
    await Promise.all(financesToArchive.map((financeToArchive) => financeModel.findByIdAndUpdate(financeToArchive._id, {
        _status: 'deleted'
    })))

    console.log("Finance auto archive job DONE.")
})

updateIPIMOfSuspendedProjects.start()

overdueStatusJob.start()

archiveFinance.start()