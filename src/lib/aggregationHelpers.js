/***
 * File name: aggregationHelpers.js
 * 
 * Description:
 * Set of helper functions for the aggregations used in the models in the
 * `model` folder
 * 
 * Module Exports:
 * - to12HourString: aggregation to convert timestamp to 12 hour string
 * - toDateFormat: aggregation to convert timestamp to date format
 */


const parseTimePartString = ({
    fieldName,
    padded = false,
    isHour = false
}) => {
    const padPipeline = padded ? {
        $concat: [
            '0',
            {
                $toString: `$${fieldName}`
            }
        ]
    } : {
        $toString: `$${fieldName}`
    }

    return isHour ? {
        $cond: [    
            {
                $gte: [
                    {
                        $toInt: `$${fieldName}` 
                    },
                    10
                ] 
            },
            {
                $concat: [
                    {
                        $toString: `$${fieldName}`
                    }
                ]
            },
            {
                $cond: [
                    {
                        $eq: [
                            {
                                $toInt: `$${fieldName}`
                            },
                            0
                        ]
                    },
                    '12',
                    padPipeline
                ]
            }
        ]
    } : {
        $cond: [
            {
                $gte: [
                    {
                        $toInt: `$${fieldName}` 
                    },
                    10
                ] 
            },
            {
                $concat: [
                    {
                        $toString: `$${fieldName}`
                    }
                ]
            },
            padPipeline
        ]
    }
}

module.exports = (settings) => ({
    to12HourString: ({
        fieldName,
        timezone = 'Asia/Manila',
        dateDelimeter = "-",
        dateFormat = "ISO8601",
        includeTime = true
    }) => {
        let timeParse = []
        if(includeTime) {
            timeParse = [
                ' ',
                parseTimePartString({
                    fieldName: `${fieldName}ToParts.hour`,
                    padded: settings.padTimes,
                    isHour: true
                }),
                ':',
                parseTimePartString({
                    fieldName: `${fieldName}ToParts.minute`,
                    padded: true
                }),
                ":",
                parseTimePartString({
                    fieldName: `${fieldName}ToParts.second`,
                    padded: true
                }),
                ' ',
                `$${fieldName}ToParts.period`
            ]
        }
        const monthDayYear = {
            $addFields: {
                [`${fieldName}`]: {
                    $concat: [
                        parseTimePartString({
                            fieldName: `${fieldName}ToParts.month`,
                            padded: settings.padDates
                        }),
                        dateDelimeter,
                        parseTimePartString({
                            fieldName: `${fieldName}ToParts.day`,
                            padded: settings.padDates
                        }),
                        dateDelimeter,
                        parseTimePartString({
                            fieldName: `${fieldName}ToParts.year`
                        }),
                        ...timeParse
                    ]
                }
            }
        }

        const iso8601 = {
            $addFields: {
                [`${fieldName}`]: {
                    $concat: [
                        parseTimePartString({
                            fieldName: `${fieldName}ToParts.year`
                        }),                        
                        dateDelimeter,
                        parseTimePartString({
                            fieldName: `${fieldName}ToParts.month`,
                            padded: settings.padDates
                        }),
                        dateDelimeter,
                        parseTimePartString({
                            fieldName: `${fieldName}ToParts.day`,
                            padded: settings.padDates
                        }),
                        ...timeParse
                    ]
                }
            }
        }
    
        let dateAgg = []

        if(dateFormat === "monthDayYear") {
            dateAgg = [ monthDayYear ]
        }

        if(dateFormat === "ISO8601") {
            dateAgg = [ iso8601 ]
        }

        return [
            {
                $addFields: {
                    [`${fieldName}ToParts`]: {
                        $dateToParts: {
                            date: `$${fieldName}`,
                            timezone
                        }
                    }
                }
            },
            {
                $addFields: {
                    [`${fieldName}ToParts.period`]: {
                        $cond: [
                            {
                                $lt: [
                                    {
                                        $toInt: `$${fieldName}ToParts.hour`
                                    },
                                    12
                                ] 
                            },
                            'AM',
                            'PM'
                        ]
                    },
                    [`${fieldName}ToParts.hour`]: {
                        $mod: [
                            `$${fieldName}ToParts.hour`,
                            12
                        ]
                    }
                }
            },
            ...dateAgg,
            {
                $project: {
                    [`${fieldName}ToParts`]: 0
                }
            }
        ] 
    }
})