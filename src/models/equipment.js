/* eslint-disable no-extra-parens */
/***
 * File name: equipment.js
 *
 * Description:
 * Schema for Project Task model to map the data that will be stored in the database.
 *
 * - Creates a schema for Project Task model that serves as a structure for all
 *   documents inside of Project Task collection in the database. For more
 *   information about schema check https://mongoosejs.com/docs/guide.html.
 * - Creates data view and search statics. For more information about statics
 *   check https://mongoosejs.com/docs/guide.html#statics.
 *   - Data view and search are used to create aggregation pipelines for
 *     processing data.
 *  - Creates pre-save hook. For more information about hooks check
 *    https://mongoosejs.com/docs/middleware.html.
 *   - Pre-save hook process the data first before saving it to database.
 *
 * Module Exports:
 * - model: The Equipment model with statics and configurations.
 */

// Rule is needed to be disabled for Mongoose
/* eslint-disable no-invalid-this */
// Rule is needed to be disabled for the ObjectId to be parsed correctly
/* eslint-disable new-cap */
// Rule is needed to enable the post-remove hook
/* eslint-disable prefer-arrow-callback */
const { Schema, Types } = require('mongoose')
const { schemaFactory, modelFactory } = require('mongodb-plugin')
const { ObjectId } = Types

const {
    padDates = true,
    padTimes = true,
    HARD_DELETE
} = require('../config/meta')
const aggregationHelper = require('../lib/aggregationHelpers')({
    padDates,
    padTimes
})

const {
    getFullName,
    lookupUnwind,
    generateSearch,
    matchNotDeleted
} = require('./lib/utils')

const autopopulate = require('mongoose-autopopulate')

const schema = new Schema(
    {
        name: {
            type: String,
            required: [
                true,
                'Equipment Name is required.'
            ],
            unique: true
        },
        quantity: {
            type: Number,
            required: [
                true,
                'Quantity is required.'
            ]
        },
        quantityInUse: {
            type: Number,
            default: 0
        },
        availability: {
            type: String,
            required: [
                true,
                'Availability is required.'
            ],
            enum: [
                'Available',
                'Not Available'
            ]
        },
        notAvailableReason: {
            type: String,
            required: [
                function() {
                    return this.availability === 'Not Available'
                },
                'Reason is required'
            ],
            default: ''
        },
        description: {
            type: String
        },
        createdBy: {
            type: ObjectId,
            ref: 'User'
        }
    },
    {
        autoCreate: true,
        timestamps: {
            createdAt: 'dateCreated',
            updatedAt: 'dateUpdated'
        },
        collation: {
            locale: 'en_US',
            strength: 1
        }
    }
)

schema.statics.hardDelete = HARD_DELETE.EQUIPMENT

schema.methods.handleDeletion = function () {
    if (this.quantityInUse > 0) {
        throw new Error('Equipment is mapped to project(s).')
    }
}

schema.methods.handleName = function () {
    if (!this.isNew && this.isModified('name')) {
        if (this.quantityInUse > 0) {
            throw new Error('Equipment is mapped to project(s).')
        }
    }
}

schema.methods.handleQuantity = function () {
    if (this.quantity < 0) {
        throw new Error('Quantity cannot be less than 0.')
    }

    if (!this.isNew && this.isModified('quantity')) {
        if (this.quantity < this.quantityInUse) {
            throw new Error('Quantity cannot be less than the quantity in use.')
        }
        if (this.quantity === this.quantityInUse) {
            this.availability = 'Not Available'
            this.notAvailableReason = 'All of the equipment is in use.'
        }
    }
}

schema.methods.handleQuantityInUse = function () {
    if (this.isModified('quantityInUse')) {
        if (this._revision && this._revision.description.includes('Modified')) {
            throw new Error('Unathorized quantity in use modification.')
        }

        if (this.isNew) {
            this.quantityInUse = 0
        }

        else if (!this.isNew) {
            if (this.quantityInUse < 0) {
                this.quantityInUse = 0
            }

            if (this.quantity < this.quantityInUse) {
                throw new Error('Quantity cannot be less than the quantity in use.')
            }

            if (this.quantity === this.quantityInUse) {
                this.availability = 'Not Available'
                this.notAvailableReason = 'All of the equipment is in use.'
            }

            else if (
                this._original.availability === 'Not Available' &&
                this.quantity === this._original.quantityInUse &&
                this.quantity > this.quantityInUse
            ) {
                this.availability = 'Available'
                this.notAvailableReason = ''
            }
        }
    }
}

schema.methods.handleNotAvailableReason = function () {
    if (!this.isNew) {
        if (this.isModified('availability')) {
            if (this.availability === 'Available') {
                this.notAvailableReason = ''
            }
        }
    }
}

schema.methods.handleAvailability = function () {
    if (!this.isNew && this.isModified('availability')) {
        if (this.availability === 'Available') {
            if (this.quantityInUse >= this.quantity) {
                throw new Error('No available equipment.')
            }
        }
    }
}

schema.methods.handleIsLocked = function () {
    if (this.isModified('isLocked') && this._revision && this._revision.description.includes('Modified')) {
        throw new Error('Unauthorized isLocked modification.')
    }
}

schema.pre('save', function(next) {
    if (this._status === "deleted" || (this._revision && this._revision.description.includes('Deleted'))) {
        this.handleDeletion()
    }

    else {
        this.handleName()

        this.handleQuantity()

        this.handleQuantityInUse()

        this.handleAvailability()

        this.handleNotAvailableReason()

        this.handleIsLocked()
    }

    next()
})

const projectDefault = [
    {
        $project: {
            _id: 1,
            _status: 1,
            name: 1,
            description: 1,
            quantity: 1,
            availability: 1,
            notAvailableReason: 1,
            createdBy: getFullName('$createdBy'),
            quantityInUse: 1
        }
    }
]

const lookups = [
    ...lookupUnwind({
        from: 'users',
        localField: 'createdBy'
    })
]


schema.statics.dataView = {
    default: (session, query) => {
        const { hasRelatedData } = query
        const matchObj = []

        if (hasRelatedData === 'true' || hasRelatedData === 'false') {
            matchObj.push({
                $match: {
                    hasRelatedData: hasRelatedData === 'true'
                }
            })
        }

        return [
            ...aggregationHelper.to12HourString({
                fieldName: 'dateCreated'
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'dateUpdated'
            }),
            matchNotDeleted(),
            ...lookups,
            ...projectDefault,
            ...matchObj
        ]
    },
    table: [
        ...aggregationHelper.to12HourString({
            fieldName: 'dateCreated'
        }),
        ...aggregationHelper.to12HourString({
            fieldName: 'dateUpdated'
        }),
        matchNotDeleted(),
        ...lookups,
        {
            $project: {
                _id: 1,
                _status: 1,
                name: 1,
                quantity: 1,
                availability: 1,
                notAvailableReason: 1,
                createdBy: getFullName('$createdBy'),
                quantityInUse: 1
            }
        }
    ]
}

const getSpecialCases = (search) => {
    if(!isNaN(Number(search))) {
        return [
            {
                $addFields: {
                    total: {
                        $subtract: [
                            '$quantity',
                            '$quantityInUse'
                        ]
                    }
                }
            },
            {
                $match: {
                    $or: [
                        {
                            total: Number(search)
                        }
                    ]
                }
            },
            {
                $project: {
                    total: 0
                }
            }
        ]
    }
    else if(search.toLowerCase() === 'not available' || search.toLowerCase() === 'available') {
        return [
            {
                $match: {
                    availability: search
                }
            }
        ]
    }
    else if(search.toLowerCase() === 'mapped') {
        return [
            {
                $match: {
                    quantityInUse: {
                        $gt: 0
                    }
                }
            }
        ]
    }
    else if(search.toLowerCase() === 'unmapped') {
        return [
            {
                $match: {
                    quantityInUse: {
                        $lte: 0
                    }
                }
            }
        ]
    }

    return []
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [ 'name' ]

        const specialCases = getSpecialCases(search)
        if(specialCases.length) {
            return specialCases
        }

        return generateSearch(search, searchAttributes)
    },
    table: function (search) {
        const searchAttributes = [ 'name' ]

        const specialCases = getSpecialCases(search)
        if(specialCases.length) {
            return specialCases
        }

        return generateSearch(search, searchAttributes)
    }
}
schema.plugin(autopopulate)
const modifiedSchema = schemaFactory(schema)

const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'Equipment'
})

module.exports = model