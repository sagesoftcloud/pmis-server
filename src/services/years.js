const models = require("../models")
const { Types } = require('mongoose')
const { ObjectId } = Types
const { timezone } = require('../config/meta')
const { RequestError } = require('error-handler')

module.exports = (collection) => async (req, res, next) => {
    try {
        const { user = req.user, userRole } = req.session

        let match = {
            $match: {
                _status: 'active'
            }
        }

        if (collection === 'project') {
            match = {
                $match: {
                    _status: 'active',
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

            if (userRole.includes('superadmin')) {
                match = {
                    $match: {
                        _status: 'active'
                    }
                }
            }
        }

        const results = await models[`${collection}`].aggregate([
            match,
            {
                $project: {
                    year: {
                        $toString: {
                            $year: {
                                date: "$dateCreated",
                                timezone
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
                    }
                }
            },
            {
                $project: {
                    _id: 0
                }
            }
        ])

        const years = results.map((result) => {
            if (result.yearCompleted) {
                return [
                    result.year,
                    result.yearCompleted
                ]
            }

            return [ result.year ]

        })

        res.status(200).json([ ...new Set(years.flat(2)) ])
    }
    catch (error) {
        next(new RequestError(400, error.message))
    }
}