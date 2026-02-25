/* eslint-disable no-undefined */
/* eslint-disable no-invalid-this */
/***
 * File name: actualExpenses.js
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
        expenses: {
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
                                        'Quantity is required'
                                    ]
                                },
                                previousQuantity: {
                                    type: Number
                                },
                                unit: {
                                    type: String,
                                    maxLength: 36
                                },
                                actualExpenses: {
                                    type: Number,
                                    required: [
                                        true,
                                        'Actual expenses is required'
                                    ]
                                },
                                remarks: {
                                    type: String,
                                    maxLength: 30
                                },
                                total: {
                                    type: Number
                                },
                                weightEquivalent: {
                                    type: Number
                                },
                                actualStartDate: {
                                    type: Date
                                },
                                actualCompletionDate: {
                                    type: Date
                                }
                            }
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
                    weightEquivalent: {
                        type: Number
                    },
                    actualStartDate: {
                        type: Date
                    },
                    actualCompletionDate: {
                        type: Date
                    }
                }
            ],
            default: []
        },
        project: {
            type: ObjectId,
            ref: 'Project',
            required: [
                true,
                'Project id is required.'
            ],
            immutable: true
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

schema.statics.hardDelete = HARD_DELETE.ACTUAL_EXPENSES

schema.methods.handleDeletion = async function () {
    const { Project } = connection.models
    await Project.findByIdAndUpdate(this.project, {
        $unset: {
            actualExpenses: ''
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

    const expenses = this.expenses
        .map((data) => {
            let expensesTotal = 0
            data.items = data.items.map((item) => {
                const quantity = item.quantity ? item.quantity : 0
                const total = this.isBOQ ? item.actualExpenses * quantity : item.actualExpenses

                expensesTotal += total

                item.total = total

                return item
            })

            data.subTotal = expensesTotal
            grandTotal += expensesTotal

            return data
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

    this.expenses = expenses

    this.grandTotal = grandTotal
}

schema.methods.validateItemType = async function () {
    const { ItemType } = connection.models
    const itemTypes = this.expenses.map((expenses) => expenses.itemType)
    await Promise.all(itemTypes.map(async (itemType) => {
        const found = await ItemType.findOne({
            name: sanitize(itemType)
        })

        if(!found) {
            throw new Error('Invalid item type.')
        }
    }))
}

schema.methods.validateItems = function () {
    for (const expense of this.expenses) {
        const hasDuplicate = new Set(expense.items.map((item) => item.name)).size !== expense.items.length
        if(hasDuplicate) {
            throw new Error(`Item already exists.`)
        }

        if (this.isBOQ) {
            expense.items.forEach((item) => {
                if (!item.actualExpenses) {
                    throw new Error('Actual Expenses is required.')
                }

                if (!item.actualStartDate) {
                    throw new Error('Actual Start Date is required.')
                }

                if (!item.actualCompletionDate) {
                    throw new Error('Actual Completion Date is required.')
                }
                item.pshsFund = undefined
                item.otherFund = undefined
            })
        }
    }
}

schema.methods.validateLineItemBudget = async function () {
    const { Project } = connection.models
    const project = await Project.findById(this.project)
    const { lineItemBudget } = project

    if(!lineItemBudget) {
        throw new Error('Project has no budget.')
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
            'expenses',
            'grandTotal'
        ]

        const isModifiedListOfObjects = isModifiedList.map((item) => ({
            value: this.isModified(item),
            fieldName: item
        }))

        const isModified = isModifiedListOfObjects.find((item) => item.value)

        if (isModified || this.isNew) {
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

schema.methods.handleProject = async function () {
    const { History, Project, User } = connection.models
    const project = await Project.findById(this.project)
    const user = await User.findById(this._revision.author.doc)

    if (this.isNew) {
        if(project.actualExpenses) {
            throw new Error(`Project already has an actual expenses data.`)
        }

        await Project.findByIdAndUpdate(this.project, {
            actualExpenses: this._id
        })

        await History.create({
            model: 'project',
            modelId: project._id,
            name: project.title,
            userId: user._id,
            userFullName: `${user.firstName} ${user.lastName}`,
            userProfilePicture: user.profilePicture,
            activities: 'Create Actual Expenses'
        })
    }

    if (!this.isNew) {
        if (this.isModified('project')) {
            throw new Error('Unauthorized project modification.')
        }

        await History.create({
            model: 'project',
            modelId: project._id,
            name: project.title,
            userId: user._id,
            userFullName: `${user.firstName} ${user.lastName}`,
            userProfilePicture: user.profilePicture,
            activities: 'Update Actual Expenses'
        })
    }

    await this.sendEmailToProjectCreator(project)
}

schema.pre('save', async function (next) {
    if(this._status === "deleted" || this._revision.description.includes('Deleted')) {
        await this.handleDeletion()
    }

    else {
        await this.handleIsBOQ()

        this.handleTotal()

        await this.validateItemType()

        this.validateItems()

        await this.validateLineItemBudget()

        await this.handleProject()
    }

    next()
})

const updateMonthlyProjectStatus = async function(doc) {
    if (doc.isBOQ) {
        const { LineItemBudget, Project } = connection.models

        const projectDoc = await Project.findById(doc.project)
        const billOfQuantityDoc = projectDoc.lineItemBudget ? await LineItemBudget.findById(projectDoc.lineItemBudget) : null

        const projectInfo = {
            projectDoc,
            billOfQuantityDoc,
            actualExpensesDoc: doc
        }

        await setCurrentProjectStatus([ projectInfo ])
    }
}

const updateIPIMMonthlyReport = async function (doc) {
    if (doc.isBOQ) {
        const { project: projectId } = doc

        const { Project, LineItemBudget, IPIMMonthlyReport } = connection.models
        const projectDoc = await Project.findById(projectId)
        const budgetDoc = await LineItemBudget.findById(projectDoc.lineItemBudget)

        const cumulatedReports = await getCumulatedReports(projectDoc, budgetDoc, doc, true)
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

// eslint-disable-next-line prefer-arrow-callback
schema.post('save', async function(doc) {
    await updateMonthlyProjectStatus(doc)

    await updateIPIMMonthlyReport(doc)
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
    modelName: 'ActualExpenses'
})

module.exports = model