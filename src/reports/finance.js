const { Types } = require('mongoose')
const { ObjectId } = Types
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
        projectStatus = null,
        financeStatus = null,
        campus = null
    } = params

    if (!quarter && !year && !dateFrom) {
        throw new Error('Date from is required')
    }

    const matchByDate = handleMatchByDate(params)

    const statusFilter = []
    const campusFilter = []

    if (projectStatus) {
        if (Array.isArray(projectStatus)) {
            const statuses = []
            projectStatus.forEach((status) => {
                statuses.push({
                    'finance.project.status': status
                })
            })
            statusFilter.push({
                $match: {
                    $or: [ ...statuses ]
                }
            })

        }
        else {
            statusFilter.push({
                $match: {
                    'finance.project.status': projectStatus
                }
            })
        }
    }

    if (financeStatus) {
        if (Array.isArray(financeStatus)) {
            const statuses = []
            financeStatus.forEach((status) => {
                statuses.push({
                    'finance.status': status
                })
            })
            statusFilter.push({
                $match: {
                    $or: [ ...statuses ]
                }
            })

        }
        else {
            statusFilter.push({
                $match: {
                    'finance.status': financeStatus
                }
            })
        }
    }

    if (campus) {
        if (Array.isArray(campus)) {
            const campuses = []
            campus.forEach((campusId) => {
                campuses.push({
                    'finance.project.campus': new ObjectId(campusId)
                })
            })
            campusFilter.push({
                $match: {
                    $or: [ ...campuses ]
                }
            })
        }
        else {
            campusFilter.push({
                $match: {
                    'finance.project.campus': campus
                }
            })
        }
    }

    return [
        {
            $lookup: {
                from: "finances",
                pipeline: [
                    matchNotDeleted(),
                    ...matchByDate,
                    {
                        $sort: {
                            dateCreated: 1
                        }
                    }
                ],
                as: "finance"
            }
        },
        {
            $unwind: "$finance"
        },
        ...lookupUnwind({
            from: 'projects',
            localField: 'finance.projectId',
            as: 'finance.project'
        }),
        ...lookupUnwind({
            from: 'projecttypes',
            localField: 'finance.project.projectType',
            as: 'finance.project.projectType'
        }),
        ...lookupUnwind({
            from: 'campus',
            localField: 'finance.project.campus',
            as: 'finance.project.projectCampus'
        }),
        ...statusFilter,
        ...campusFilter,
        {
            $project: {
                projectTitle: '$finance.project.title',
                projectStatus: '$finance.project.status',
                campus: '$finance.project.projectCampus.name',
                projectType: '$finance.project.projectType.name',
                financeStatus: '$finance.status',
                approvedProposedBudget: '$finance.approvedProposedBudget',
                obligatedAmount: '$finance.obligatedAmount',
                obligatedItem: '$finance.obligatedItem',
                dateCreated: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$finance.dateCreated",
                        timezone: "Asia/Manila"
                    }
                }
            }
        },
        {
            $sort: {
                dateCreated: -1
            }
        }
    ]
}