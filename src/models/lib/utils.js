/* eslint-disable max-params */
const { timezone } = require('../../config/meta')
const utils = {
    getFullName: (user) => {
        const firstName = user ? `${user}.firstName` : '$firstName'
        const middleName = user ? `${user}.middleName` : '$middleName'
        const lastName = user ? `${user}.lastName` : '$lastName'

        return {
            $concat: [
                firstName,
                ' ',
                {
                    $cond: [
                        {
                            $and: [
                                {
                                    $eq: [
                                        {
                                            $type: middleName
                                        },
                                        'string'
                                    ]
                                },
                                {
                                    $ne: [
                                        middleName,
                                        ''
                                    ]
                                }
                            ]
                        },
                        {
                            $concat: [
                                {
                                    $substr: [
                                        middleName,
                                        0,
                                        1
                                    ]
                                },
                                '.',
                                ' '
                            ]
                        },
                        ''
                    ]
                },
                lastName
            ]
        }
    },

    generateSearch: function(search, searchAttributes) {
        // eslint-disable-next-line prefer-named-capture-group
        const searchVal = search.replace(/([[\]<>*()?])/gu, "\\$1")
        const searchFields = searchAttributes.map((attr) => ({
            [attr]: {
                $regex: searchVal,
                $options: 'i'
            }
        }))

        const mapDict = {
            mapped: 'Mapped',
            unmapped: 'Unmapped'
        }

        if(searchVal.toLowerCase() === 'unmapped' || searchVal.toLowerCase() === 'mapped') {
            return [].concat([
                {
                    $match: {
                        hasRelatedData: mapDict[`${searchVal.toLowerCase()}`] === 'Mapped'
                    }
                }
            ])
        }

        if((searchVal === 'active' || searchVal === 'inactive') && searchAttributes.includes('_status')) {
            return [].concat([
                {
                    $match: {
                        _status: searchVal
                    }
                }
            ])
        }

        return [].concat([
            {
                $match: {
                    $or: searchFields
                }
            }
        ])
    },

    lookupUnwind: ({
        from,
        localField,
        foreignField = '_id',
        preserve = true,
        unwind = true,
        as,
        projection
    }) => {
        let lookup = [
            {
                $lookup: {
                    from,
                    localField,
                    foreignField,
                    as: as ? as : localField
                }
            }
        ]
        if (projection) {
            lookup = [
                {
                    $lookup: {
                        from,
                        let: {
                            matchingId: `$${localField}`
                        },
                        pipeline: [
                            {
                                $match: {
                                    _status: {
                                        $ne: 'deleted'
                                    },
                                    $expr: {
                                        $eq: [
                                            '$$matchingId',
                                            `$${foreignField}`
                                        ]
                                    }
                                }
                            },
                            {
                                $project: projection
                            }
                        ],
                        as: as ? as : localField
                    }
                }
            ]
        }

        if(unwind) {
            lookup.push({
                $unwind: {
                    path: `$${as ? as : localField}`,
                    preserveNullAndEmptyArrays: preserve
                }
            })
        }

        return lookup
    },

    validateTableRelationship (relatedTable, foreignField, isArray = false, resultName = "hasRelatedData") {
        const andCondition = isArray ? {
            $in: [
                '$$rId',
                `$${foreignField}`
            ]
        } : {
            $eq: [
                `$${foreignField}`,
                '$$rId'
            ]
        }
        return [
            {
                $lookup: {
                    from: relatedTable,
                    let: {
                        rId: '$_id'
                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        andCondition,
                                        {
                                            $eq: [
                                                '$_status',
                                                'active'
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: resultName
                }
            },
            {
                $addFields: {
                    [resultName]: {
                        $cond: [
                            {
                                $gt: [
                                    {
                                        $size: `$${resultName}`
                                    },
                                    0
                                ]
                            },
                            true,
                            false
                        ]
                    }
                }
            }
        ]
    },
    // to check if values are modified
    valueModified: (item, values) => values.some((val) => item.isModified(val)),
    matchNotDeleted: (field = '_status') => ({
        $match: {
            [field]: {
                $ne: 'deleted'
            }
        }
    }),
    handleUploadedBy: (fieldName = 'documents') => [
        ...utils.lookupUnwind({
            from: 'users',
            localField: `${fieldName}.uploadedBy`,
            as: 'uploadedBy',
            unwind: false
        }),
        {
            $addFields: {
                fromUploadedBy: {
                    $map: {
                        input: '$uploadedBy',
                        in: {
                            userId: '$$this._id',
                            fullName: {
                                $concat: [
                                    '$$this.firstName',
                                    ' ',
                                    '$$this.lastName'
                                ]
                            }
                        }
                    }
                }
            }
        },
        {
            $addFields: {
                [`${fieldName}`]: {
                    $map: {
                        input: `$${fieldName}`,
                        as: 'document',
                        in: {
                            $mergeObjects: [
                                "$$document",
                                {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: "$fromUploadedBy",
                                                as: 'fromDocument',
                                                cond: {
                                                    $eq: [
                                                        "$$document.uploadedBy",
                                                        "$$fromDocument.userId"
                                                    ]
                                                }
                                            }
                                        },
                                        0
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        }
    ],
    formatAttachment: (fieldName) => [
        ...utils.lookupUnwind({
            from: 'users',
            localField: `${fieldName}.uploadedBy`,
            as: `${fieldName}.uploadedBy`
        }),
        {
            $addFields: {
                [`${fieldName}`]: {
                    fieldname: `$${fieldName}.fieldname`,
                    originalname: `$${fieldName}.originalname`,
                    encoding: `$${fieldName}.encoding`,
                    mimetype: `$${fieldName}.mimetype`,
                    destination: `$${fieldName}.destination`,
                    filename: `$${fieldName}.filename`,
                    path: `$${fieldName}.path`,
                    size: `$${fieldName}.size`,
                    userId: `$${fieldName}.uploadedBy._id`,
                    fullName: {
                        $cond: [
                            {
                                $ne: [
                                    {
                                        $concat: [
                                            `$${fieldName}.uploadedBy.firstName`,
                                            ' ',
                                            `$${fieldName}.uploadedBy.lastName`
                                        ]
                                    },
                                    null
                                ]
                            },
                            {
                                $concat: [
                                    `$${fieldName}.uploadedBy.firstName`,
                                    ' ',
                                    `$${fieldName}.uploadedBy.lastName`
                                ]
                            },
                            '$$REMOVE'
                        ]

                    },
                    uploadDate: {
                        $dateToString: {
                            date: `$${fieldName}.uploadDate`,
                            timezone,
                            format: '%Y-%m-%d %H:%M:%S',
                            onNull: '$$REMOVE'
                        }
                    }
                }
            }
        },
        {
            $project: {
                [`${fieldName}.uploadedBy`]: 0
            }
        },
        {
            $addFields: {
                [`${fieldName}`]: {
                    $cond: [
                        {
                            $eq: [
                                `$${fieldName}`,
                                {
                                }
                            ]
                        },
                        null,
                        `$${fieldName}`
                    ]
                }
            }
        }
    ],
    isProperBudget: (number) => {
        let result = true;
        if (number) {
            const valueToTest = number.toString().split('.')
            result = (/^\d{1,7}?$/u).test(valueToTest[0])
            if (result && valueToTest.length === 2) {
                result = (/^\d{0,2}?$/u).test(valueToTest[1])
            }
        }
        return result
    },
    validateMappedRecords (fieldName, foreignField, relatedDocuments) {
        const lookups = relatedDocuments.map((doc) => ({
            $lookup: {
                from: `${doc.document}`,
                let: {
                    field: `$${fieldName}`
                },
                pipeline: [
                    {
                        $project: {
                            [`${doc.itemsField}.${foreignField}`]: 1
                        }
                    },
                    {
                        $unwind: {
                            path: `$${doc.itemsField}`
                        }
                    },
                    {
                        $match: {
                            $expr: {
                                $eq: [
                                    `$${doc.itemsField}.${foreignField}`,
                                    `$$field`
                                ]
                            }
                        }
                    }
                ],
                as: `${doc.document}`
            }
        }))

        const conditions = relatedDocuments.map((doc) => ({
            $gt: [
                {
                    $size: `$${doc.document}`
                },
                0
            ]
        }))

        return [
            ...lookups,
            {
                $addFields: {
                    hasRelatedData: {
                        $cond: [
                            {
                                $or: [ ...conditions ]
                            },
                            true,
                            false
                        ]
                    }
                }
            }
        ] 
    }
}

module.exports = utils