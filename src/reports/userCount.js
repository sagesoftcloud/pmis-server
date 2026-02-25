/* eslint-disable new-cap */

module.exports = {
    count: () => ({
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
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    activeUser: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        {
                                            $eq: [
                                                '$_status',
                                                'active'
                                            ]
                                        }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    totalCount: {
                        $sum: 1
                    }
                }
            }
        ]
    })
}