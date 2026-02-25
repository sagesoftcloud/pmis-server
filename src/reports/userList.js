/* eslint-disable new-cap */

module.exports = {
    csv: () => ({
        modelName: "user",
        aggPipeline: [
            {
                $unwind: {
                    path: '$userRole',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $match: {
                    userRole: {
                        $nin: [
                            'examinee',
                            'guest'
                        ]
                    },
                    _status: 'active'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'createdBy',
                    foreignField: '_id',
                    as: 'createdBy'
                }
            },
            {
                $unwind: {
                    path: '$createdBy',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    createdBy: {
                        $concat: [
                            '$createdBy.firstName',
                            ' ',
                            '$createdBy.lastName'
                        ]
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    __v: 0,
                    _revision: 0,
                    _status: 0,
                    dateUpdated: 0,
                    updatedBy: 0
                }
            }
        ]
    })
}