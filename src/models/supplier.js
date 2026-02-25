/***
 * File name: supplier.js
 *
 * Description:
 * Schema for Supplier model to map the data that will be stored in the database.
 *
 * - Creates a schema for Supplier model that serves as a structure for all
 *   documents inside of Supplier collection in the database. For more
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
 * - model: The Supplier model with statics and configurations.
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
    generateSearch,
    matchNotDeleted,
    getFullName,
    lookupUnwind
} = require('./lib/utils')

const schema = new Schema(
    {
        name: {
            type: String,
            required: [
                true,
                'Supplier Name is required.'
            ],
            unique: true
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

schema.statics.hardDelete = HARD_DELETE.SUPPLIER

schema.methods.handleDeletion = function () {
    // check if it's mapped to other models
}

schema.pre('save', function(next) {
    // eslint-disable-next-line no-extra-parens
    if (this._status === "deleted" || (this._revision && this._revision.description.includes('Deleted'))) {
        this.handleDeletion()
    }

    else {
        // do nothing
    }

    next()
})

const projectDefault = [
    {
        $project: {
            _id: 1,
            name: 1,
            hasRelatedData: 1,
            createdBy: getFullName('$createdBy')
        }
    }
]

const lookups = [
    ...lookupUnwind({
        from: 'users',
        localField: 'createdBy'
    })
]

const checkRelationships = [
    // ...validateTableRelationship('finances', 'supplier', false, 'hasRelatedData')
    // uncomment code above and remove code below if finances is ready to be mapped.
    {
        $addFields: {
            hasRelatedData: false
        }
    }
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
            ...checkRelationships,
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
        ...checkRelationships,
        {
            $project: {
                _id: 1,
                name: 1,
                hasRelatedData: 1,
                createdBy: getFullName('$createdBy')
            }
        }
    ]
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [
            'name',
            'createdBy'
        ]

        return generateSearch(search, searchAttributes)
    },
    table: function (search) {
        const searchAttributes = [
            'name',
            'createdBy'
        ]

        return generateSearch(search, searchAttributes)
    }
}

const modifiedSchema = schemaFactory(schema)

const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'Supplier'
})

module.exports = model