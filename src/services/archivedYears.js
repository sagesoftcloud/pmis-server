const models = require("../models")
const { timezone } = require('../config/meta')
const { RequestError } = require('error-handler')

module.exports = (collection) => async (req, res, next) => {
    try {
        const results = await models[`${collection}`].aggregate([
            {
                $match: {
                    _status: 'deleted'
                }
            },
            {
                $project: {
                    year: {
                        $toString: {
                            $year: {
                                date: "$dateCreated",
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

        const years = results.map((result) => result.year)

        res.status(200).json([ ...new Set(years) ])
    }
    catch (error) {
        next(new RequestError(400, error.message))
    }
}