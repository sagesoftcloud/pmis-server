const { lookupUnwind, matchNotDeleted } = require('../models/lib/utils')
const { timezone } = require('../config/meta')
const moment = require('moment')

const filterByDate = (params) => {
    const { quarter } = params
    let { year } = params
    if (!isNaN(quarter)) {
        const validQuarters = [
            '1',
            '2',
            '3',
            '4'
        ]

        if (!validQuarters.includes(quarter)) {
            throw new Error("Invalid Quarter")
        }

        if (!year) {
            year = new Date(Date.now())
                .getFullYear()
                .toString()
        }

        return [
            {
                $match: {
                    yearCreated: year,
                    quarterCreated: quarter
                }
            }
        ]
    }

    else if (!isNaN(year)) {
        return [
            {
                $match: {
                    yearCreated: year
                }
            }
        ]
    }

    return []
}

const handleMatchByDate = (params) => {
    const {
        dateFrom,
        dateTo
    } = params
    const { quarter, year } = params

    const isValidDateFrom = moment(dateFrom).isValid()
    const isValidDateTo = moment(dateTo).isValid()

    if (isValidDateFrom && isValidDateTo) {
        return [
            {
                $match: {
                    dateCreated: {
                        $gte: dateFrom,
                        $lte: dateTo
                    }
                }
            }
        ]
    }

    else if (!isValidDateTo && isValidDateFrom) {
        return [
            {
                $match: {
                    dateCreated: {
                        $gte: dateFrom
                    }
                }
            }
        ]
    }

    else if (quarter || year) {
        return [
            {
                $addFields: {
                    quarterCreated: {
                        $toString: {
                            $trunc: {
                                $add: [
                                    {
                                        $divide: [
                                            {
                                                $subtract: [
                                                    {
                                                        $month: "$dateCreated"
                                                    },
                                                    1
                                                ]
                                            },
                                            3
                                        ]
                                    },
                                    1
                                ]
                            }
                        }
                    },
                    yearCreated: {
                        $toString: {
                            $year: {
                                date: "$dateCreated",
                                timezone
                            }
                        }
                    }
                }
            },
            ...filterByDate({
                quarter,
                year
            })
        ]
    }

    throw new Error('No date restriction.')
}

module.exports = (params) => {
    const {
        dateFrom,
        quarter,
        year,
        projectStatus = null
    } = params

    if (!quarter && !year && !dateFrom) {
        throw new Error('Date from is required')
    }

    const matchByDate = handleMatchByDate(params)

    let statusFilter = []

    if (projectStatus) {
        if (Array.isArray(projectStatus)) {
            const statuses = []
            projectStatus.forEach((status) => {
                statuses.push({
                    'accounting.project.status': status
                })
            })
            statusFilter = [
                {
                    $match: {
                        $or: [ ...statuses ]
                    }
                }
            ]
        }
        else {
            statusFilter = [
                {
                    $match: {
                        'accounting.project.status': projectStatus
                    }
                }
            ]
        }

    }

    return [
        {
            $lookup: {
                from: 'accountingmanagements',
                pipeline: [
                    matchNotDeleted(),
                    ...matchByDate,
                    {
                        $sort: {
                            dateCreated: 1
                        }
                    }
                ],
                as: 'accounting'
            }
        },
        {
            $unwind: '$accounting'
        },
        ...lookupUnwind({
            from: 'projects',
            localField: 'accounting.project'
        }),
        ...statusFilter,
        {
            $lookup: {
                from: 'lineitembudgets',
                let: {
                    projectId: '$accounting.project._id'
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: [
                                    '$project',
                                    '$$projectId'
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            grandTotal: 1
                        }
                    }
                ],
                as: 'budget'
            }
        },
        {
            $unwind: {
                path: '$budget',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'actualexpenses',
                let: {
                    projectId: '$accounting.project._id'
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: [
                                    '$project',
                                    '$$projectId'
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            grandTotal: 1
                        }
                    }
                ],
                as: 'expenses'
            }
        },
        {
            $unwind: {
                path: '$expenses',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $addFields: {
                totalExpenses: {
                    $ifNull: [
                        '$expenses.grandTotal',
                        0
                    ]
                }
            }
        },
        {
            $project: {
                totalBudget: '$budget.grandTotal',
                remainingProjectFunds: {
                    $subtract: [
                        '$budget.grandTotal',
                        '$totalExpenses'
                    ]
                },
                projectTitle: '$accounting.project.title',
                projectStatus: '$accounting.project.status',
                totalActualRelease: '$accounting.totalActualRelease',
                totalAccountPayable: '$accounting.totalAccountPayable',
                totalActualDisbursed: '$accounting.totalActualDisbursed',
                totalUnreleased: '$accounting.totalUnreleased',
                remarks: '$accounting.remarks'
            }
        }
    ]
}