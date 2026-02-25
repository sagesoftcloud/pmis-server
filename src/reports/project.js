/* eslint-disable no-empty-pattern */
const { Types } = require('mongoose')
const { ObjectId } = Types
const { lookupUnwind, matchNotDeleted } = require('../models/lib/utils')
const { timezone } = require('../config/meta')
const moment = require('moment')

const userModel = require('../models/user')

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
                $addFields: {
                    yearAndQuarterCreated: {
                        $concat: [
                            '$yearCreated',
                            '$quarterCreated'
                        ]
                    }
                }
            },
            {
                $match: {
                    $or: [
                        {
                            $and: [
                                {
                                    $expr: {
                                        $eq: [
                                            '$isOpen',
                                            true
                                        ]
                                    }
                                },
                                {
                                    $expr: {
                                        $lte: [
                                            '$yearAndQuarterCreated',
                                            `${year}${quarter}`
                                        ]
                                    }
                                }
                            ]
                        },
                        {
                            $and: [
                                {
                                    $expr: {
                                        $eq: [
                                            '$quarterCompleted',
                                            quarter
                                        ]
                                    }
                                },
                                {
                                    $expr: {
                                        $eq: [
                                            '$yearCompleted',
                                            year
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                }
            }
        ]
    }

    else if (!isNaN(year)) {
        return [
            {
                $match: {
                    $or: [
                        {
                            $and: [
                                {
                                    $expr: {
                                        $eq: [
                                            '$isOpen',
                                            true
                                        ]
                                    }
                                },
                                {
                                    yearCreated: {
                                        $lte: year
                                    }
                                }
                            ]
                        },
                        {
                            $expr: {
                                $eq: [
                                    '$yearCompleted',
                                    year
                                ]
                            }
                        }
                    ]
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
                    },
                    quarterCompleted: {
                        $toString: {
                            $trunc: {
                                $add: [
                                    {
                                        $divide: [
                                            {
                                                $subtract: [
                                                    {
                                                        $month: "$actualCompletionDate"
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
                    yearCompleted: {
                        $toString: {
                            $year: {
                                date: "$actualCompletionDate",
                                timezone
                            }
                        }
                    },
                    isOpen: {
                        $cond: [
                            {
                                $eq: [
                                    '$status',
                                    'Completed'
                                ]
                            },
                            false,
                            true
                        ]
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

module.exports = async (params) => {
    const {
        dateFrom,
        quarter,
        year,
        projectStatus = null,
        projectType = null,
        assignedTo = null,
        department = null,
        campus = null,
        biddingStatus = null,
        user
    } = params
    if (!quarter && !year && !dateFrom) {
        throw new Error('Date from is required')
    }

    let matchDepartments = []

    const matchByDate = handleMatchByDate(params)

    const matchParams = {
    }

    if (projectStatus) {
        if (Array.isArray(projectStatus)) {
            matchParams.status = {
                $in: projectStatus
            }
        }
        else {
            matchParams.status = projectStatus
        }
    }
    if (campus) {
        if (Array.isArray(campus)) {
            matchParams.campus = {
                $in: campus.flatMap((entry) => new ObjectId(entry))
            }
        }
        else {
            matchParams.campus = campus
        }
    }
    if (biddingStatus) {
        if (Array.isArray(biddingStatus)) {
            matchParams.biddingStatus = {
                $in: biddingStatus
            }
        }
        else {
            matchParams.biddingStatus = biddingStatus
        }
    }
    if (projectType) {
        if (Array.isArray(projectType)) {
            matchParams.projectType = {
                $in: projectType.flatMap((entry) => new ObjectId(entry))
            }
        }
        else {
            matchParams.projectType = new ObjectId(projectType)
        }
    }
    if (assignedTo) {
        if (Array.isArray(assignedTo)) {
            matchParams.members = {
                $in: assignedTo.flatMap((entry) => new ObjectId(entry))
            }
        }
        else {
            matchParams.members = {
                $in: new ObjectId(assignedTo)
            }
        }
    }
    if (department) {
        if (Array.isArray(department)) {
            matchDepartments = [
                {
                    $match: {
                        $expr: {
                            $gt: [
                                {
                                    $size:
                                    {
                                        $setIntersection: [
                                            '$departments',
                                            department
                                        ]
                                    }
                                },
                                0
                            ]
                        }
                    }
                }
            ]
            matchParams.department = {
                $in: department.flatMap((entry) => new ObjectId(entry))
            }
        }
        else {
            matchParams.department = new ObjectId(department)
        }

    }

    let matchUser = [
        {
            $match: {
                $or: [
                    {
                        members: new ObjectId(user)
                    },
                    {
                        createdBy: new ObjectId(user)
                    }
                ]
            }
        }
    ]

    const userDoc = await userModel.findById(user)

    if (userDoc && (userDoc.userRole.includes('admin') || userDoc.userRole.includes('superadmin'))) {
        matchUser = []
    }

    return [
        {
            $lookup: {
                from: "projects",
                pipeline: [
                    matchNotDeleted(),
                    ...matchUser,
                    ...matchByDate,
                    {
                        $match: matchParams
                    },
                    ...matchDepartments,
                    {
                        $sort: {
                            dateCreated: 1
                        }
                    }
                ],
                as: "projects"
            }
        },
        {
            $unwind: "$projects"
        },
        {
            $project: {
                projectTitle: "$projects.title",
                projectType: "$projects.projectType",
                createdBy: "$projects.createdBy",
                department: "$projects.department",
                dateCreated: "$projects.dateCreated",
                campus: "$projects.campus",
                biddingStatus: "$projects.biddingStatus",
                dateStarted: {
                    $ifNull: [
                        "$projects.startDate",
                        null
                    ]
                },
                dateEstimated: {
                    $ifNull: [
                        "$projects.expectedDate",
                        null
                    ]
                },
                status: "$projects.status"
            }
        },
        ...lookupUnwind({
            from: 'users',
            localField: 'createdBy'
        }),
        ...lookupUnwind({
            from: 'departments',
            localField: 'department'
        }),
        ...lookupUnwind({
            from: 'projecttypes',
            localField: 'projectType'
        }),
        ...lookupUnwind({
            from: 'campus',
            localField: 'campus'
        }),
        {
            $project: {
                projectTitle: 1,
                projectType: "$projectType.name",
                createdBy: {
                    $concat: [
                        "$createdBy.firstName",
                        {
                            $cond: [
                                {
                                    $and: [
                                        {
                                            $eq: [
                                                {
                                                    $type: `$createdBy.middleName`
                                                },
                                                'string'
                                            ]
                                        },
                                        {
                                            $ne: [
                                                `$createdBy.middleName`,
                                                ''
                                            ]
                                        }
                                    ]
                                },
                                {
                                    $concat: [
                                        ' ',
                                        '$createdBy.middleName',
                                        ' '
                                    ]
                                },
                                ' '
                            ]
                        },
                        "$createdBy.lastName"
                    ]
                },
                department: "$department.name",
                dateCreated: 1,
                dateStarted: 1,
                dateEstimated: 1,
                campus: "$campus.name",
                biddingStatus: 1,
                status: 1
            }
        },
        {
            $addFields: {
                dateCreated: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$dateCreated",
                        timezone: "Asia/Manila"
                    }
                }
            }
        },
        {
            $addFields: {
                dateStarted: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$dateStarted",
                        timezone: "Asia/Manila"
                    }
                }
            }
        },
        {
            $addFields: {
                dateEstimated: {
                    $dateToString: {
                        format: "%Y-%m-%d",
                        date: "$dateEstimated",
                        timezone: "Asia/Manila"
                    }
                }
            }
        }
    ]
}