/***
 * File name: itemType.js
 *
 * Description:
 * Schema for Item Type model to map the data that will be stored in the database.
 *
 * - Creates a schema for Item Type model that serves as a structure for all
 *   documents inside of Item Type collection in the database. For more
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
 * - model: The Item Type model with statics and configurations.
 */

/* eslint-disable require-await */
// Rule is needed to be disabled for Mongoose
/* eslint-disable no-invalid-this */
// Rule is needed to be disabled for the ObjectId to be parsed correctly
/* eslint-disable new-cap */
const { Schema, Types } = require('mongoose')
const { schemaFactory, modelFactory } = require('mongodb-plugin')
const { ObjectId } = Types
const { validateMappedRecords } = require('./lib/utils')

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
                'Item type name is required.'
            ],
            unique: true
        },
        createdBy: {
            type: ObjectId,
            ref: 'User'
        },
        ownership: {
            type: String,
            enum: [
                'All',
                'Creator'
            ],
            default: 'All'
        },
        itemCategory: {
            type: String,
            enum: [
                'Goods',
                'Services'
            ],
            default: 'Goods',
            immutable: true
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

schema.statics.hardDelete = HARD_DELETE.ITEM_TYPE

const relatedDocuments = [
    {
        document: 'lineitembudgets',
        itemsField: 'budgets'
    },
    {
        document: 'actualexpenses',
        itemsField: 'expenses'
    },
    {
        document: 'finances',
        itemsField: 'obligatedItem'
    }
]

schema.methods.handleOwnership = function () {
    if (!this.isNew) {
        const editor = this._revision.author.doc
        const creator = this.createdBy ? this.createdBy : ''
        if (this.isModified('ownership')) {
            if (editor.toString() !== creator.toString()) {
                throw new Error('Only creator can update the ownership.')
            }
        }
    }
}

schema.methods.validateMapping = async function () {
    if(this.isModified('name') || this.isModified('ownership') || this.isModified('itemCategory')) {
        const mappedItemType = await this.constructor.aggregate([
            {
                $match: {
                    _status: {
                        $ne: 'deleted'
                    },
                    _id: this._id
                }
            },
            ...validateMappedRecords(
                'name',
                'itemType',
                relatedDocuments
            ),
            {
                $match: {
                    hasRelatedData: true
                }
            }
        ])

        if(mappedItemType.length) {
            throw new Error('Item Type is currently being used in other transactions.')
        }
    }
}

schema.pre('save', async function() {
    if(!this.isNew) {
        await this.validateMapping()
    }

    this.handleOwnership()
})

const projectDefault = [
    {
        $project: {
            _id: 1,
            name: 1,
            createdBy: getFullName('$createdBy'),
            _status: 1,
            ownership: 1,
            hasRelatedData: 1,
            itemCategory: 1
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
    default: (session) => {
        const { user, userRole } = session

        let roleFilter = [
            {
                $match: {
                    $or: [
                        {
                            ownership: 'All'
                        },
                        {
                            createdBy: user
                        }
                    ]

                }
            }
        ]

        if (userRole.includes('superadmin')) {
            roleFilter = []
        }

        return [
            matchNotDeleted(),
            ...roleFilter,
            ...aggregationHelper.to12HourString({
                fieldName: 'dateCreated'
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'dateUpdated'
            }),
            ...lookups,
            ...validateMappedRecords(
                'name',
                'itemType',
                relatedDocuments
            ),
            ...projectDefault
        ]
    },
    table: (session) => {
        const { user, userRole } = session

        let roleFilter = [
            {
                $match: {
                    $or: [
                        {
                            ownership: 'All'
                        },
                        {
                            createdBy: user
                        }
                    ]

                }
            }
        ]

        if (userRole.includes('superadmin')) {
            roleFilter = []
        }

        return [
            matchNotDeleted(),
            ...roleFilter,
            ...aggregationHelper.to12HourString({
                fieldName: 'dateCreated'
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'dateUpdated'
            }),
            ...lookups,
            ...validateMappedRecords(
                'name',
                'itemType',
                relatedDocuments
            ),
            ...projectDefault
        ]
    }
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [
            'name',
            'createdBy',
            'ownership'
        ]

        return generateSearch(search, searchAttributes)
    },
    table: function (search) {
        const searchAttributes = [
            'name',
            'createdBy',
            'ownership'
        ]

        return generateSearch(search, searchAttributes)
    }
}

schema.plugin(autopopulate)
const modifiedSchema = schemaFactory(schema)

const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'ItemType'
})

module.exports = model