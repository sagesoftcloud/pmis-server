/***
 * File name: campus.js
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
    matchNotDeleted,
    validateTableRelationship
} = require('./lib/utils')

const schema = new Schema(
    {
        name: {
            type: String,
            required: [
                true,
                'Campus name is required.'
            ],
            unique: true
        },
        code: {
            type: String,
            required: [
                true,
                'Campus code is required.'
            ],
            unique: true
        },
        fadChief: {
            type: String,
            required: [
                true,
                'FAD Chief is required.'
            ],
            unique: true,
            maxLength: 250
        },
        director: {
            type: String,
            required: [
                true,
                'Director is required.'
            ],
            unique: true,
            maxLength: 250
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

schema.statics.hardDelete = HARD_DELETE.CAMPUS

schema.methods.validateMapping = async function () {
    const mappedCampus = await this.constructor.aggregate([
        {
            $match: {
                _status: {
                    $ne: 'deleted'
                },
                _id: this._id
            }
        },
        ...validateTableRelationship('projects', 'campus', false, 'hasRelatedData'),
        {
            $match: {
                hasRelatedData: true
            }
        }
    ])

    if(mappedCampus.length) {
        throw new Error('Campus is currently mapped to other document(s).')
    }
}


schema.methods.handleDeletion = async function () {
    await this.validateMapping()
}

schema.pre('save', async function () {
    if(!this.isAttachment) {
        if (this.isNew) {
            // run new campus logic
        }
        else if (this._status === "deleted" || this._revision.description.includes('Deleted')) {
            await this.handleDeletion()
        }

        else if (!this.isNew) {
            if (this.isModified('name') || this.isModified('code')) {
                await this.validateMapping()
            }
        }
    }
})

const projectDefault = [
    ...validateTableRelationship('projects', 'campus', false, 'hasRelatedData'),
    {
        $project: {
            _id: 1,
            name: 1,
            code: 1,
            fadChief: 1,
            director: 1,
            createdBy: getFullName('$createdBy'),
            _status: 1,
            hasRelatedData: 1
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
    default: [
        matchNotDeleted(),
        ...aggregationHelper.to12HourString({
            fieldName: 'dateCreated'
        }),
        ...aggregationHelper.to12HourString({
            fieldName: 'dateUpdated'
        }),
        ...lookups,
        ...projectDefault
    ],
    table: [
        matchNotDeleted(),
        ...aggregationHelper.to12HourString({
            fieldName: 'dateCreated'
        }),
        ...aggregationHelper.to12HourString({
            fieldName: 'dateUpdated'
        }),
        ...lookups,
        ...projectDefault
    ]
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [
            'name',
            'code',
            'createdBy'
        ]

        return generateSearch(search, searchAttributes)
    },
    table: function (search) {
        const searchAttributes = [
            'name',
            'code',
            'createdBy'
        ]

        return generateSearch(search, searchAttributes)
    }
}

const modifiedSchema = schemaFactory(schema)

const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'Campus'
})

module.exports = model