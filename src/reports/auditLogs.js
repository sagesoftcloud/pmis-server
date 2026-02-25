/* eslint-disable new-cap */
/* eslint-disable no-empty-pattern */
const {
    padDates = true,
    padTimes = true
} = require('../config/meta')
const aggregationHelper = require('../lib/aggregationHelpers')({
    padDates,
    padTimes
})
const { lookupUnwind } = require('../models/lib/utils')

module.exports = ({ dateFrom, dateTo, email, module, actions }) => {
    let collectionNames = [
        'actualexpenses',
        'appconfiguration',
        'authentication',
        'authorization',
        'department',
        'equipment',
        'itemtype',
        'lineitembudget',
        'project',
        'projecttask',
        'projecttype',
        'user',
        'finance'
    ]

    const matchObj = []

    if(email) {
        matchObj.push({
            $match: {
                $expr: {
                    $in: [
                        '$email',
                        email
                    ]
                }
            }
        })
    }

    if(module) {
        collectionNames = collectionNames.filter((collection) => collection === module)
    }

    if(actions) {
        const actionsDict = {
            create: 'Created',
            edit: 'Modified',
            login: 'logged in',
            logout: 'logged out',
            delete: 'Deleted',
            deactivate: 'Deactivated',
            activate: 'activated',
            'change password': 'Changed password.',
            upload: 'uploaded',
            download: 'downloaded',
            'archive document': 'flagged',
            'recover document': 'recovered document',
            'archive attachment': 'archived file',
            'recover attachment': 'recovered file',
            'delete attachment': 'deleted file'
        }

        const actionMatches = actions.map((action) => {
            const descriptionMatch = {
                description: {
                    $regex: actionsDict[`${action}`],
                    $options: 'i'
                }
            }
            return descriptionMatch
        })

        matchObj.push({
            $match: {
                $or: actionMatches
            }
        })
    }

    const concatArray = collectionNames.map((collectionName) => `$${collectionName}_patches`)

    const pipeline = collectionNames.map((collectionName) => {
        let projectNameAggregation = []
        if (collectionName === 'project') {
            projectNameAggregation = [
                {
                    $addFields: {
                        projectId: '$ref'
                    }
                },
                ...lookupUnwind({
                    from: 'projects',
                    localField: 'projectId',
                    foreignField: '_id',
                    as: 'project'
                })
            ]
        }

        else {
            let collectionNamePlural = `${collectionName}s`

            const weirdPlurals = [
                'actualExpenses',
                'campus',
                'equipment'
            ]

            if (weirdPlurals.includes(collectionName)) {
                collectionNamePlural = collectionName
            }

            projectNameAggregation = [
                {
                    $addFields: {
                        [`${collectionName}Id`]: '$ref'
                    }
                },
                ...lookupUnwind({
                    from: `${collectionNamePlural}`,
                    localField: `${collectionName}Id`,
                    foreignField: '_id',
                    as: collectionName
                }),
                {
                    $addFields: {
                        projectId: `$${collectionName}.project`
                    }
                },
                ...lookupUnwind({
                    from: 'projects',
                    localField: 'projectId',
                    foreignField: '_id',
                    as: 'project'
                })
            ]
        }

        if (collectionName === 'projecttask') {
            projectNameAggregation = projectNameAggregation.concat([
                {
                    $addFields: {
                        taskTitle: `$${collectionName}.title`
                    }
                }
            ])
        }

        return {
            $lookup: {
                from: `${collectionName}_patches`,
                pipeline: [
                    {
                        $match: {
                            date: {
                                $gte: dateFrom,
                                $lte: dateTo
                            },
                            _revision: {
                                $exists: true
                            }
                        }
                    },
                    {
                        $addFields: {
                            author: '$_revision.author.doc',
                            description: '$_revision.description'
                        }
                    },
                    ...lookupUnwind({
                        from: 'users',
                        localField: 'author'
                    }),
                    {
                        $addFields: {
                            userType: '$author.userType',
                            userRole: '$author.userRole',
                            email: '$author.email'
                        }
                    },
                    ...aggregationHelper.to12HourString({
                        fieldName: 'date'
                    }),
                    ...matchObj,
                    ...projectNameAggregation,
                    {
                        $project: {
                            author: {
                                $concat: [
                                    '$author.firstName',
                                    ' ',
                                    '$author.lastName'
                                ]
                            },
                            userType: 1,
                            userRole: 1,
                            email: 1,
                            description: 1,
                            date: 1,
                            ref: 1,
                            collection: `${collectionName}`,
                            projectTitle: '$project.title',
                            taskTitle: 1
                        }
                    },
                    {
                        $sort: {
                            date: 1
                        }
                    }
                ],
                as: `${collectionName}_patches`
            }
        } 
    })

    return [
        ...pipeline,
        {
            $project: {
                result: {
                    $concatArrays: concatArray
                }
            }
        },
        {
            $unwind: '$result'
        },
        {
            $group: {
                _id: '$result._id',
                date: {
                    $first: '$result.date'
                },
                author: {
                    $first: '$result.author'
                },
                userRole: {
                    $first: '$result.userRole'
                },
                email: {
                    $first: '$result.email'
                },
                description: {
                    $first: '$result.description'
                },
                ref: {
                    $first: '$result.ref'
                },
                collection: {
                    $first: '$result.collection'
                },
                projectTitle: {
                    $first: '$result.projectTitle'
                },
                taskTitle: {
                    $first: '$result.taskTitle'
                }
            }
        },
        {
            $sort: {
                date: 1
            }
        }
    ]
}