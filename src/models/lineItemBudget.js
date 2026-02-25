/* eslint-disable no-extra-parens */
/* eslint-disable no-undefined */
/* eslint-disable no-invalid-this */
/***
 * File name: lineItemBudget.js
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
 * - model: The Line Item Budget model with statics and configurations.
 */
const { Schema, Types, connection } = require('mongoose')
const { schemaFactory, modelFactory } = require('mongodb-plugin')
const { generateSearch } = require('./lib/utils')
const { ObjectId } = Types
const sanitize = require('mongo-sanitize')
const { transporter } = require('../config/auth')
const { appData, protocol, domain } = require('../config')
const moment = require('moment')
const { setCurrentProjectStatus } = require('../lib/setCurrentProjectStatus')
const { getCumulatedReports } = require('../lib/ipimHelpers')
const { HARD_DELETE } = require('../config/meta')

const schema = new Schema(
    {
        budgets: {
            type: [
                {
                    items: {
                        type: [
                            {
                                name: {
                                    type: String,
                                    required: [
                                        true,
                                        'Item Name is required.'
                                    ]
                                },
                                quantity: {
                                    type: Number,
                                    required: [
                                        true,
                                        'Item Quantity is required.'
                                    ]
                                },
                                unit: {
                                    type: String
                                },
                                pshsFund: {
                                    type: Number
                                },
                                otherFund: {
                                    type: Number
                                },
                                amount: {
                                    type: Number
                                },
                                remarks: {
                                    type: String,
                                    maxLength: 30
                                },
                                total: {
                                    type: Number
                                },
                                expectedStartDate: {
                                    type: Date
                                },
                                expectedCompletionDate: {
                                    type: Date
                                },
                                weightEquivalent: {
                                    type: Number
                                }
                            }
                        ],
                        required: [
                            true,
                            'Items are required.'
                        ]
                    },
                    itemType: {
                        type: String,
                        required: [
                            true,
                            'Item type is required'
                        ]
                    },
                    subTotal: {
                        type: Number
                    },
                    expectedStartDate: {
                        type: Date
                    },
                    expectedCompletionDate: {
                        type: Date
                    },
                    weightEquivalent: {
                        type: Number
                    }
                }
            ],
            default: []
        },
        project: {
            type: ObjectId,
            required: [
                true,
                'Project id is required.'
            ],
            immutable: true,
            ref: 'Project'
        },
        grandTotal: {
            type: Number
        },
        isBOQ: {
            type: Boolean,
            default: false
        },

        createdBy: {
            type: ObjectId,
            ref: 'User',
            immutable: true
        },
        updatedBy: {
            type: ObjectId,
            ref: 'User'
        },
        initialVersion: {
            type: Object,
            default: []
        },
        isEdited: {
            type: Boolean
        },
        revision: {
            type: Number,
            default: 0
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

schema.statics.hardDelete = HARD_DELETE.LINE_ITEM_BUDGET

schema.methods.handleDeletion = async function () {
    const { Project } = connection.models
    await Project.findByIdAndUpdate(this.project, {
        $unset: {
            lineItemBudget: ''
        }
    })
}

schema.methods.handleIsBOQ = async function () {
    if (this.isNew) {
        const { Project, ProjectType } = connection.models
        const project = await Project.findById(this.project)
        const projectType = await ProjectType.findById(project.projectType)
        this.isBOQ = projectType.isBOQ
    }

    else if (this.isModified('isBOQ')) {
        throw new Error('Unauthorized modification of isBOQ.')
    }
}

schema.methods.handleTotal = function () {
    let grandTotal = 0

    const budgets = this.budgets
        .map((budget) => {
            let budgetTotal = 0
            budget.items = budget.items.map((item) => {
                const amount = this.isBOQ ? item.amount : item.pshsFund + item.otherFund
                const total = this.isBOQ ? amount * item.quantity : amount

                budgetTotal += total

                item.total = total

                return item
            })

            budget.subTotal = budgetTotal
            grandTotal += budgetTotal

            return budget
        })
        .sort((a, b) => {
            if (a.itemType < b.itemType) {
                return -1;
            }
            if (a.itemType > b.itemType) {
                return 1;
            }
            return 0;
        })


    this.budgets = budgets

    this.grandTotal = grandTotal
}

schema.methods.validateItemType = async function () {
    const { ItemType } = connection.models
    const itemTypes = this.budgets.map((budget) => budget.itemType)
    await Promise.all(itemTypes.map(async (itemType) => {
        const found = await ItemType.findOne({
            name: sanitize(itemType)
        })

        if(!found) {
            throw new Error('Invalid item type.')
        }
    }))
}

schema.methods.handleItems = function () {
    for (const budget of this.budgets) {
        const hasDuplicate = new Set(budget.items.map((item) => item.name)).size !== budget.items.length
        if (hasDuplicate) {
            throw new Error(`Item already exists.`)
        }

        if (this.isBOQ) {
            budget.items.forEach((item) => {
                if (!item.amount) {
                    throw new Error('Amount is required.')
                }

                if (!item.expectedStartDate) {
                    throw new Error('Expected Start Date is required.')
                }

                if (!item.expectedCompletionDate) {
                    throw new Error('Expected CompletionDate is required.')
                }
                item.pshsFund = undefined
                item.otherFund = undefined
            })
        }
        else {
            budget.items.forEach((item) => {
                if (!item.pshsFund && item.pshsFund !== 0) {
                    throw new Error('PSHS Fund is required.')
                }
                if (!item.otherFund && item.otherFund !== 0) {
                    throw new Error('Other Fund is required.')
                }

                item.amount = undefined
            })
        }
    }
}

schema.methods.handleInitialVersion = function () {
    if(this.isModified('initialVersion') && this._original.initialVersion.length) {
        throw new Error('Unauthorized initial version modification.')
    }

    if (this.budgets.length && !this.initialVersion.length) {
        this.initialVersion = this.budgets
    }
}

schema.methods.handleIsEdited = function () {
    if (this.isNew) {
        this.isEdited = false
    }

    else if (!this.isNew) {
        if (this.isModified('isEdited')) {
            throw new Error('Unauthorized isEdited modification')
        }
        this.isEdited = true
    }
}

schema.methods.sendEmailToProjectCreator = async function (project) {
    const editor = this._revision.author.doc
    const createdBy = project.createdBy.toString()

    if (editor.toString() !== createdBy.toString()) {
        const { User } = connection.models

        const authorDoc = await User.findById(editor).exec()
        const createdByDoc = await User.findById(createdBy).exec()

        const isModifiedList = [
            'budgets',
            'grandTotal'
        ]

        const isModifiedListOfObjects = isModifiedList.map((item) => ({
            value: this.isModified(item),
            fieldName: item
        }))

        const isModified = isModifiedListOfObjects.find((item) => item.value)

        if (isModified) {
            transporter.sendEmailTemplate({
                userObject: createdByDoc,
                from: appData.email,
                to: createdByDoc.email,
                subject: `[PSHS - Project Monitoring System (PMS)] Project Update`,
                filename: `project_updated`,
                emailData: {
                    authorDoc,
                    createdByDoc,
                    projectTitle: `${project.title}`,
                    dateNow: moment().format('LLLL'),
                    projectLink: `${protocol}://${domain}/admin/project/view/${project._id}`
                }
            })
        }

    }
}

schema.methods.handleRevision = function() {
    if (!this.isNew) {
        if (this.revision) {
            this.revision += 1
        }

        else {
            this.revision = 1
        }
    }
}

schema.methods.handleProject = async function () {
    const { History, Project, User } = connection.models
    const project = await Project.findById(this.project)
    const user = await User.findById(this._revision.author.doc)

    if (this.isBOQ && project.abc < this.grandTotal) {
        throw new Error(`BOQ grand total should not be greater than the ABC amount.`)
    }

    if (this.isNew) {
        if(project.lineItemBudget) {
            throw new Error(`Project already has a line item budget.`)
        }

        await Project.findByIdAndUpdate(this.project, {
            lineItemBudget: this._id
        })
    }

    if (!this.isNew) {
        if (this.isModified('project')) {
            throw new Error('Unauthorized project modification.')
        }

        const action = this.isBOQ ? 'Update BOQ' : 'Update LIB'

        await History.create({
            model: 'project',
            modelId: project._id,
            name: project.title,
            userId: user._id,
            userFullName: `${user.firstName} ${user.lastName}`,
            userProfilePicture: user.profilePicture,
            activities: action
        })

        await this.sendEmailToProjectCreator(project)
    }
}

schema.pre('save', async function (next) {
    if(this._status === "deleted" || this._revision.description.includes('Deleted')) {
        await this.handleDeletion()
    }

    else {
        await this.handleIsBOQ()

        this.handleTotal()

        await this.validateItemType()

        this.handleItems()

        this.handleInitialVersion()

        this.handleIsEdited()

        this.handleRevision()

        await this.handleProject()

        this.wasNew = this.isNew
    }

    next()
})

const updateMonthlyProjectStatus = async function(doc) {
    if (doc.isBOQ) {
        const { ActualExpenses, Project } = connection.models

        const projectDoc = await Project.findById(doc.project)
        const actualExpensesDoc = projectDoc.actualExpenses ? await ActualExpenses.findById(projectDoc.actualExpenses) : null

        const projectInfo = {
            projectDoc,
            billOfQuantityDoc: doc,
            actualExpensesDoc
        }

        await setCurrentProjectStatus([ projectInfo ])
    }
}

const updateIPIMMonthlyReport = async function (doc) {
    if (doc.isBOQ) {
        const { project: projectId } = doc

        const { Project, ActualExpenses, IPIMMonthlyReport } = connection.models
        const projectDoc = await Project.findById(projectId)
        const actualExpenses = projectDoc.actualExpenses ? await ActualExpenses.findById(projectDoc.actualExpenses) : null

        const cumulatedReports = await getCumulatedReports(projectDoc, doc, actualExpenses, true)
        const ipimMonthlyReports = await IPIMMonthlyReport.find({
            projectId
        })

        await Promise.all(ipimMonthlyReports.map(async (ipimReport) => {
            const cumulatedReport = cumulatedReports.find((report) => report.reportingMonth === ipimReport.reportingMonth && report.projectId.toString() === ipimReport.projectId.toString())

            if (cumulatedReport) {
                await IPIMMonthlyReport.findByIdAndUpdate(ipimReport._id, cumulatedReport)
            }

            return ipimReport
        }))
    }
}

const updateFinance = async function (doc) {
    if (doc.wasNew) {
        const { Finance, Project } = connection.models

        const finance = await Finance.create({
            projectId: doc.project,
            approvedProposedBudget: doc.grandTotal,
            status: 'For Budget'
        })

        await Project.findByIdAndUpdate(doc.project, {
            finance: finance._id
        })

    }
    else {
        const { Finance } = connection.models

        const [ finance ] = await Finance.find({
            projectId: doc.project
        })

        const remainingBudget = doc.grandTotal - (finance.obligatedAmount ? finance.obligatedAmount : 0)

        await Finance.findByIdAndUpdate(finance._id, {
            approvedProposedBudget: doc.grandTotal,
            remainingBudget
        })
    }
}


// eslint-disable-next-line prefer-arrow-callback
schema.post('save', async function(doc) {
    await updateMonthlyProjectStatus(doc)

    await updateIPIMMonthlyReport(doc)

    if (!doc.isBOQ) {
        await updateFinance(doc)
    }
})

schema.statics.dataView = {
    default: [
        {
            $match: {
                _status: {
                    $ne: 'deleted'
                }
            }
        },
        {
            $project: {
                __v: 0
            }
        }
    ],
    table: [
        {
            $match: {
                _status: {
                    $ne: 'deleted'
                }
            }
        },
        {
            $project: {
                __v: 0
            }
        }
    ]
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [
            'name',
            'createdBy',
            'itemType'
        ]

        return generateSearch(search, searchAttributes)
    },
    table: function (search) {
        const searchAttributes = [
            'name',
            'createdBy',
            'itemType'
        ]

        return generateSearch(search, searchAttributes)
    }
}

const modifiedSchema = schemaFactory(schema)

const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'LineItemBudget'
})

module.exports = model