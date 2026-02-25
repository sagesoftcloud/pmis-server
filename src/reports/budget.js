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
                    'budget.project.status': status
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
                        'budget.project.status': projectStatus
                    }
                }
            ]
        }

    }


    return [
        {
            $lookup: {
                from: "budgetmanagements",
                pipeline: [
                    matchNotDeleted(),
                    ...matchByDate,
                    {
                        $sort: {
                            dateCreated: 1
                        }
                    }
                ],
                as: "budget"
            }
        },
        {
            $unwind: "$budget"
        },
        ...lookupUnwind({
            from: 'projects',
            localField: 'budget.project'
        }),
        ...statusFilter,
        {
            $project: {
                projectTitle: '$budget.project.title',
                projectStatus: '$budget.project.status',
                budgetPerformance: '$budget.budgetPerformance',
                approvedBudget: '$budget.approvedBudget',
                releasedBudget: '$budget.releasedBudget',
                disbursedBudget: '$budget.disbursedBudget',
                accountsPayable: '$budget.accountsPayable',
                balance: '$budget.balance',
                disbursementRate: '$budget.disbursementRate',
                expenditureRate: '$budget.expenditureRate',
                budgetUtilization: '$budget.budgetUtilization',
                remarks: '$budget.remarks'
            }
        }
    ]
}