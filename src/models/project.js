/* eslint-disable no-extra-parens */
/***
 * File name: project.js
 *
 * Description:
 * Schema for Project model to map the data that will be stored in the database.
 *
 * - Creates a schema for Project model that serves as a structure for all
 *   documents inside of Project collection in the database. For more
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
 * - model: The Project model with statics and configurations.
 */

// Rule is needed to be disabled for Mongoose
/* eslint-disable no-invalid-this */
/* eslint-disable new-cap */
const mongoose = require('mongoose')
const { Schema, Types, connection } = mongoose
const moment = require('moment')
const { schemaFactory, modelFactory } = require('mongodb-plugin')
const { ObjectId } = Types
const { transporter } = require('../config/auth')
const { appData, protocol, domain } = require('../config')
const sanitize = require('mongo-sanitize')

const {
    padDates = true,
    padTimes = true,
    dateFormat,
    timezone,
    maxFileUploadSize,
    HARD_DELETE
} = require('../config/meta')
const aggregationHelper = require('../lib/aggregationHelpers')({
    padDates,
    padTimes
})
const autopopulate = require('mongoose-autopopulate')
const AutoIncrement = require('mongoose-sequence')(mongoose)

const {
    getFullName,
    generateSearch,
    lookupUnwind,
    matchNotDeleted,
    handleUploadedBy,
    formatAttachment
} = require('./lib/utils')
const attachment = require('../schema/attachment')
const { cloneArray, sentenceCase, unlinkFileFromFilePath } = require('../lib/utils')
const { setCurrentProjectStatus } = require('../lib/setCurrentProjectStatus')
const { getMonthName } = require('../lib/ipimHelpers')

const schema = new Schema(
    {
        title: {
            type: String,
            required: [
                true,
                'Title is required.'
            ],
            unique: true,
            immutable: true,
            maxLength: 500
        },
        objective: {
            type: String,
            required: [
                true,
                'Objective is required.'
            ]
        },
        description: {
            type: String,
            required: [
                true,
                'Description is required.'
            ]
        },
        projectType: {
            type: ObjectId,
            ref: 'ProjectType',
            required: [
                true,
                'Project Type is required.'
            ],
            immutable: true
        },
        departments: {
            type: [ ObjectId ],
            ref: 'Department'
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
        members: {
            type: [ ObjectId ],
            ref: 'User'
        },
        dateCreated: {
            type: Date,
            immutable: true
        },
        expectedStartDate: {
            type: Date,
            index: true
        },
        expectedCompletionDate: {
            type: Date,
            index: true
        },
        actualStartDate: {
            type: Date
        },
        actualCompletionDate: {
            type: Date
        },
        biddingStatus: {
            type: String,
            required: [
                true,
                'Bidding Status is required.'
            ],
            enum: [
                'Successful Bidding',
                'Failed Bidding',
                'Negotiated Procurement'
            ]
        },
        negotiatedProcurementDate: {
            type: Date
        },
        status: {
            type: String,
            required: [
                true,
                "Status is required."
            ],
            enum: [
                'Not Yet Started',
                'Active',
                'On Hold',
                'Overdue',
                'Completed',
                'Suspended',
                'Terminated'
            ],
            index: true
        },
        campus: {
            type: ObjectId,
            ref: 'Campus',
            required: [
                true,
                'Campus is required.'
            ]
        },
        remarks: {
            type: [
                {
                    author: {
                        type: ObjectId
                    },
                    date: {
                        type: Date,
                        default: Date.now
                    },
                    message: {
                        type: String
                    },
                    remarkId: {
                        type: ObjectId
                    }
                }
            ]
        },
        remarkAction: {
            type: String,
            enum: [
                'add',
                'remove'
            ],
            default: 'add'
        },

        id: {
            type: Number,
            unique: true
            // this is auto-incremented
        },

        // used to know which tasks belong to this project
        tasks: {
            type: [ ObjectId ]
        },

        equipments: {
            type: [
                {
                    _id: {
                        type: ObjectId,
                        ref: 'Equipment',
                        required: [
                            true,
                            'Equipment ID is required.'
                        ]
                    },
                    name: {
                        type: String,
                        required: [
                            true,
                            'Equipment name is required.'
                        ]
                    },
                    quantity: {
                        type: Number,
                        required: [
                            true,
                            'Equipment quantity is required.'
                        ],
                        validate: {
                            validator: function(v) {
                                return v > 0
                            },
                            message: () => `Quantity must be greater than 0.`
                        }
                    }
                }
            ],
            default: []
        },

        // used to know which lineItemBudget is linked with project
        lineItemBudget: {
            type: ObjectId,
            ref: 'LineItemBudget',
            default: null
        },
        // used to know which actualExpenses is linked with project
        actualExpenses: {
            type: ObjectId,
            ref: 'ActualExpenses',
            default: null
        },

        // used to know which finance is linked with project
        finance: {
            type: ObjectId,
            ref: 'Finance',
            default: null
        },

        // required documents of infrastructure projects
        termsOfReference: {
            type: attachment
        },
        contract: {
            type: attachment
        },
        noticeToProceed: {
            type: attachment
        },
        billOfQuantity: {
            type: attachment
        },
        documents: [ attachment ],

        // required fields of infrastructure projects
        fundingSource: {
            type: String
        },
        nameOfContractor: {
            type: String
        },
        contractorProjectEngineer: {
            type: String
        },
        location: {
            type: String
        },
        dateOfInvitation: {
            type: Date
        },
        bidOpening: {
            type: Date
        },
        dateOfAward: {
            type: Date
        },
        dateOfNoticeToProceed: {
            type: Date
        },
        gaaAmount: {
            type: Number
        },
        abc: {
            type: Number
        },
        contractCost: {
            type: Number
        },
        orList: {
            type: [
                {
                    orNumber: {
                        type: String
                    },
                    orAmount: {
                        type: Number
                    }
                }
            ]
        },
        billingSchedule: {
            type: String
        },
        budgetOfficer: {
            type: String
        },

        // suspension information
        suspensionDate: {
            type: Date
        },
        daysSuspended: {
            type: Number,
            default: 0
        },

        // grant extension
        numberOfExtensionDays: {
            type: Number
        },
        extensionBasis: {
            type: String
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

schema.statics.hardDelete = HARD_DELETE.PROJECT

schema.methods.handleAttachments = async function () {
    const { ProjectType } = connection.models
    const projectType = await ProjectType.findById(this.projectType)
    if (!projectType.isBOQ) {
        throw new Error('Only Infrastructure/Construction Project type can upload documents.')
    }
}

const decreaseQuantityInUse = async (equipments) => {
    const { Equipment } = connection.models
    await Promise.all(equipments.map(async (equipment) => {
        const equipmentDoc = await Equipment.findById(equipment._id)
        equipmentDoc.quantityInUse = equipmentDoc.quantityInUse
            ? equipmentDoc.quantityInUse - equipment.quantity
            : 0

        await equipmentDoc.save()
    }))
}

schema.methods.handleDeletion = async function () {
    const { ActualExpenses, LineItemBudget, Finance } = connection.models

    if(this.tasks.length) {
        throw new Error(`${this.title} has task(s) mapped to it.`)
    }

    if (this.finance) {
        const finance = await Finance.findById(this.finance)

        await finance.deleteDocuments()

        await finance.save({
            validateBeforeSave: false
        })

        await finance.remove()
    }

    if (this.lineItemBudget) {
        await LineItemBudget.findByIdAndDelete(this.lineItemBudget)
    }

    if (this.actualExpenses) {
        await ActualExpenses.findByIdAndDelete(this.actualExpenses)
    }

    const documents = [
        this.termsOfReference,
        this.contract,
        this.noticeToProceed,
        this.billOfQuantity
    ]

    if (documents.length) {
        for await(const document of documents) {
            if (document) {
                await unlinkFileFromFilePath(document, (err) => {
                    if (err) {
                        throw new Error(err)
                    }
                })
            }
        }
    }

    await decreaseQuantityInUse(cloneArray(this.equipments))
}

schema.methods.validateMembersDepartment = async function (projectType) {
    if(this.members && this.members.length) {
        if (!projectType.isBOQ) {
            const { User } = connection.models
            const lookupMembersDepartment = async (memberId) => {
                const member = await User.findById(memberId)
                return member.department
            }

            const membersDepartments = await Promise.all(this.members.map((member) => lookupMembersDepartment(member)))
            const membersDepartmentString = membersDepartments.map((department) => department.toString())
            const departmentsString = this.departments.toString()
            const strayDepartment = membersDepartmentString.filter((department) => !departmentsString.includes(department))

            if(strayDepartment.length) {
                throw new Error("Member(s) do not belong to these department(s).")
            }
        }
    }
}

schema.methods.validateUpdateMembers = function (tasks) {
    if(!this.isNew && tasks && tasks.length && this.isModified('members')) {
        const projectMembers = this.members.concat(this.createdBy)
        const projectMembersString = projectMembers.map((member) => member.toString())

        const taskWithAssignees = tasks
            .filter((task) => task.assignTo)
            .map((task) => task.assignTo)
            .flat()
        const taskAssigneesString = taskWithAssignees.map((assignee) => assignee.toString())

        for (const assignee of taskAssigneesString) {
            if(!projectMembersString.includes(assignee)) {
                throw new Error('Member(s) is/are mapped to task(s).')
            }
        }
    }
}

schema.methods.handleDatesOfUpdatedStatus = function() {
    if(this.status === "Active") {
        if (!this.actualStartDate) {
            this.actualStartDate = Date.now()
        }

        if (this._original.status === "Suspended") {
            const daysSuspended = this.daysSuspended || 0
            const suspensionDate = moment(this.suspensionDate).startOf('day')
            const current = moment().startOf('day')
            this.daysSuspended = daysSuspended + (current.diff(suspensionDate, 'days'))
            this.suspensionDate = null
        }

    }

    else if(this.status === "Completed") {
        this.actualCompletionDate = Date.now()

        if (!this.actualStartDate) {
            this.actualStartDate = Date.now()
        }

        if (this._original.status === "Suspended") {
            const daysSuspended = this.daysSuspended ? this.daysSuspended : 0
            const suspensionDate = moment(this.suspensionDate).startOf('day')
            const current = moment().startOf('day')
            this.daysSuspended = daysSuspended + (current.diff(suspensionDate, 'days'))
            this.suspensionDate = null
        }

    }

    else if (this.status === "Suspended") {
        this.suspensionDate = Date.now()
    }
}

schema.methods.handleDates = function () {
    if (this.isNew && this.status === 'Active') {
        this.actualStartDate = new Date()
    }

    if(this.expectedStartDate && this.expectedCompletionDate) {
        const expectedStartDate = moment(this.expectedStartDate)
            .format('YYYY-MM-DD')
        const expectedCompletionDate = moment(this.expectedCompletionDate)
            .format('YYYY-MM-DD')

        if(expectedStartDate > expectedCompletionDate) {
            throw new Error('Expected start date cannot be greater than the expected completion date.')
        }
    }

    if(!this.isNew && this.isModified('status')) {
        this.handleDatesOfUpdatedStatus()
    }
}

schema.methods.handleStatus = function (tasks) {
    if(this.isNew) {
        const allowedStatuses = [
            'Not Yet Started',
            'Active',
            'Suspended',
            'Terminated'
        ]

        if(!allowedStatuses.includes(this.status)) {
            throw new Error('Invalid status.')
        }
    }

    else if(!this.isNew) {
        if(this.isModified('status')) {
            const allNotCompletedTaskStatus = tasks.filter((task) => task.status !== "Completed")

            if(allNotCompletedTaskStatus.length && this.status === 'Completed') {
                throw new Error('Some tasks are still Active.')
            }

            else if(this._original.status === 'Active' && this.status === 'Not Yet Started') {
                throw new Error('Invalid status.')
            }

            else if (this._original.status === 'Completed') {
                throw new Error('Invalid status.')
            }

            else if (this._original.status === 'Terminated') {
                throw new Error('Invalid status.')
            }
        }

        else if(this.status === 'Suspended') {
            if(!this.isModified('status')) {
                throw new Error("Change the status to edit this document.")
            }
        }

        else if(this.status === "Completed") {
            throw new Error("Completed project cannot be edited.")
        }

        else if(this.status === "Terminated") {
            throw new Error("Terminated project cannot be edited.")
        }
    }
}

schema.methods.handleDepartment = async function (projectType) {
    if(this.members && this.members.length) {
        if(!this.departments || !this.departments.length) {
            if (!projectType.isBOQ) {
                throw new Error('No department selected.')
            }
        }
    }

    if(!this.isNew) {
        const hasDeparments = this._original.departments && this._original.departments.length
        if(hasDeparments && this.tasks && this.tasks.length && this.isModified('departments')) {
            const { User, ProjectTask } = connection.models
            const tasks = await Promise.all(this.tasks.map((task) => ProjectTask.findById(task)))
            const taskMembers = tasks.map((task) => {
                const members = task.assignTo ? task.assignTo.concat(task.createdBy) : [ task.createdBy ]

                return members.toString()
            }).flat()

            const uniqueTaskMembers = [ ...new Set(taskMembers) ]
            const lookedUpMembers = await Promise.all(uniqueTaskMembers.map((member) => User.findById(new ObjectId(member))))
            const membersDepartmentsString = lookedUpMembers.map((member) => member.department.toString())
            const departmentsString = this.departments.map((department) => department.toString())

            membersDepartmentsString.forEach((department) => {
                if (!departmentsString.includes(department)) {
                    throw new Error("Department is mapped to the task.")
                }
            })
        }
    }
}

schema.methods.validateTasks = function () {
    if(this.isNew) {
        if(this.tasks.length) {
            throw new Error('Unauthorized tasks modification.')
        }
    }

    else if(!this.isNew) {
        if(this.isModified('tasks')) {
            throw new Error('Unauthorized tasks modification.')
        }
    }
}

schema.methods.validateLineItemBudget = function () {
    if(!this.isNew && this._original.lineItemBudget && this.isModified('lineItemBudget')) {
        throw new Error('Unauthorized line item budget modification.')
    }
}

schema.methods.validateActualExpenses = function () {
    if(!this.isNew && this._original.actualExpenses && this.isModified('actualExpenses')) {
        throw new Error('Unauthorized actual expenses modification.')
    }
}

schema.methods.handleRemarks = function () {
    if (this.isNew || this.isModified('remarks')) {
        const author = this._revision.author.doc

        if (this.remarkAction === 'add') {
            // push to remarks array
            let allRemarks = this.isNew ? [] : this._original.remarks

            // add author and date to remarks
            const newRemarks = this.remarks.map((remark) => {
                if (!remark.id) {
                    throw new Error('Remark message is required.')
                }
                return {
                    remarkId: new ObjectId(),
                    author,
                    message: remark.message,
                    date: new Date(Date.now())
                }
            })

            allRemarks = allRemarks.concat(newRemarks)

            this.remarks = allRemarks
        }

        else {
            // remove remarks
            const remarkIdsToRemove = this.remarks.map((remark) => {
                if (!remark.remarkId) {
                    throw new Error('Remark id is required.')
                }

                return remark.remarkId.toString()
            })

            const filteredRemarks = this._original.remarks.filter((remark) => remarkIdsToRemove.includes(remark.remarkId.toString()))

            const filteredRemarksOwnedByAuthor = filteredRemarks.filter((remark) => remark.author.toString() === author.toString())

            if (filteredRemarks.length !== filteredRemarksOwnedByAuthor.length) {
                throw new Error('You cannot remove others\' remarks.')
            }

            const newRemarks = this._original.remarks.filter((remark) => !remarkIdsToRemove.includes(remark.remarkId.toString()))

            this.remarks = newRemarks
        }

        this.remarkAction = 'add'
    }
}

schema.methods.validateAbc = function (projectType) {
    if (projectType.isBOQ) {
        if(!this.abc) {
            throw new Error('ABC is required.')
        }
    }
}

const increaseQuantityInUse = async (equipments) => {
    const { Equipment } = connection.models
    const validEquipments = await Promise.all(equipments.map(async (equipment) => {
        const newEquipment = await Equipment.findById(equipment._id)

        const totalQuantityInUse = newEquipment.quantityInUse
            ? newEquipment.quantityInUse + equipment.quantity
            : equipment.quantity

        if (totalQuantityInUse > newEquipment.quantity) {
            throw new Error(`Equipment ${equipment.name} quantity exceeds the quantity of the available equipment.`)
        }

        newEquipment.quantityInUse = totalQuantityInUse

        return newEquipment
    }))

    await Promise.all(validEquipments.map((validNewEquipment) => validNewEquipment.save()))
}

const removeUnchangedEquipments = (oldEquipments, newEquipments) => {
    const filteredEquipments = newEquipments.filter((newEquipment) => {
        const isExisting = oldEquipments.find((oldEquip) => oldEquip.name === newEquipment.name &&
            oldEquip.quantity === newEquipment.quantity)
        return !isExisting
    })

    return filteredEquipments
}

// will return the equipments removed by user
const getRemovedEquipments = (oldEquipments, newEquipments) => {
    const removedEquipments = oldEquipments.filter((oldEquip) => !newEquipments.find((newEquip) => newEquip._id.toString() === oldEquip._id.toString()))

    return removedEquipments
}

const separateChangedEquipments = (oldEquipments, changedEquipments) => {
    const increasedEquipments = []
    const decreasedEquipments = []

    const changedEquipmentsCopy = cloneArray(changedEquipments)
    const oldEquipmentsCopy = cloneArray(oldEquipments)

    for (const changedEquip of changedEquipmentsCopy) {
        const foundOldEquip = oldEquipmentsCopy.find((oldEquip) => oldEquip._id.toString() === changedEquip._id.toString())

        if (foundOldEquip) {
            if (changedEquip.quantity > foundOldEquip.quantity) {
                changedEquip.quantity -= foundOldEquip.quantity
                increasedEquipments.push(changedEquip)
            }
            else if (changedEquip.quantity < foundOldEquip.quantity) {
                changedEquip.quantity = foundOldEquip.quantity - changedEquip.quantity
                decreasedEquipments.push(changedEquip)
            }
        }
        else {
            increasedEquipments.push(changedEquip)
        }
    }

    return {
        increasedEquipments,
        decreasedEquipments
    }
}

const checkEquipments = async (equipments, operation) => {
    const { Equipment } = connection.models

    await Promise.all(equipments.map(async (equipment) => {
        const found = await Equipment.findById(equipment._id)

        if (found.name !== equipment.name) {
            throw new Error(`Equipment name '${equipment.name}' is invalid.`)
        }

        if(operation === 'increase') {
            if(found.availability === 'Not Available') {
                throw new Error(`Equipment '${found.name}' is unavailable.`)
            }
        }
    }))
}

// increase or decrease quantityInUse of equipments in Equipment model
schema.methods.handleEquipmentSideEffect = async function () {
    const newEquipments = cloneArray(this.equipments)


    if (this.isNew) {
        await increaseQuantityInUse(newEquipments)

        this.isEquipmentUpdated = true
    }

    else if (!this.isNew) {
        const { Project } = connection.models
        const oldProject = await Project.findById(this._id)
        const oldEquipments = cloneArray(oldProject.equipments)
        const changedEquipments = removeUnchangedEquipments(oldEquipments, newEquipments)

        const removedEquipments = getRemovedEquipments(oldEquipments, newEquipments)
        const { increasedEquipments, decreasedEquipments } = separateChangedEquipments(oldEquipments, changedEquipments)

        const sideEffectPromises = []
        const checkPromises = []

        if (removedEquipments.length) {
            checkPromises.push(() => checkEquipments(removedEquipments, 'decrease'))
            sideEffectPromises.push(() => decreaseQuantityInUse(removedEquipments))
            this.isEquipmentUpdated = true
        }

        if (decreasedEquipments.length) {
            checkPromises.push(() => checkEquipments(decreasedEquipments, 'decrease'))
            sideEffectPromises.push(() => decreaseQuantityInUse(decreasedEquipments))
            this.isEquipmentUpdated = true
        }

        if (increasedEquipments.length) {
            checkPromises.push(() => checkEquipments(increasedEquipments, 'increase'))
            sideEffectPromises.push(() => increaseQuantityInUse(increasedEquipments))
            this.isEquipmentUpdated = true
        }

        await Promise.all(checkPromises.map((promise) => promise()))
        await Promise.all(sideEffectPromises.map((promise) => promise()))

    }
}

const validateBudgetManagement = (isModified, revision) => {
    if (isModified && revision) {
        throw new Error('Unauthorized budgetManagement modification.')
    }
}

// will only send email if the editor is not the creator
schema.methods.sendEmailToProjectCreator = async function () {
    const editor = this._revision.author.doc

    if (!editor) {
        return
    }

    if (editor.toString() !== this.createdBy.toString()) {
        const { User } = connection.models

        const authorDoc = await User.findById(editor)
        const createdByDoc = await User.findById(this.createdBy)
        let isModifiedList = []
        isModifiedList = [
            'description',
            'objective',
            'projectType',
            'departments',
            'members',
            'expectedStartDate',
            'expectedCompletionDate',
            'actualStartDate',
            'actualCompletionDate',
            'status',
            'campus',
            'location',
            'fundingSource',
            'nameOfContractor',
            'contractorProjectEngineer',
            'remarks',
            'equipments',
            'numberOfExtensionDays',
            'extensionBasis',
            'dateOfInvitation',
            'bidOpening',
            'dateOfAward',
            'dateOfNoticeToProceed'
        ]

        if (this.isAttachment) {
            isModifiedList = [
                'termsOfReference',
                'contract',
                'noticeToProceed',
                'billOfQuantity'
            ]
        }

        const isModifiedListOfObjects = isModifiedList.map((item) => {
            let value = this.isModified(item)

            if (item === 'remarks') {
                value = this.isRemarksUpdated
            }

            else if (item === 'equipments') {
                value = this.isEquipmentUpdated
            }

            return {
                value,
                fieldName: item
            }
        }).filter((item) => item.value)

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
                    projectTitle: `${this.title}`,
                    dateNow: moment().format('LLLL'),
                    projectLink: `${protocol}://${domain}/admin/project/view/${this._id}`
                }
            })
        }

    }
}

schema.methods.handleSpecialCaseValues = async function(item, value) {
    const { Campus, Department, User } = connection.models

    let val = value

    if (item.fieldName === 'campus') {
        const valCampus = await Campus.findById(val)
        val = valCampus ? valCampus.name : ''
    }

    else if (item.fieldName === 'departments') {
        if (Array.isArray(val) && val.length > 0) {
            const valDepartments = []
            for await (const departmentId of val) {
                const department = await Department.findById(departmentId)

                if (department && department.name) {
                    valDepartments.push(department.name)
                }
            }

            val = valDepartments.join(', ')
        }

        else {
            val = ''
        }
    }

    else if (item.fieldName === 'members') {
        if (Array.isArray(val) && val.length > 0) {
            const valMembers = []
            for await (const memberId of val) {
                const user = await User.findById(memberId)

                if (user) {
                    valMembers.push(`${user.firstName} ${user.lastName}`)
                }
            }

            val = valMembers.join(', ')
        }

        else {
            val = ''
        }
    }

    else if (item.fieldName === 'equipments') {
        if (Array.isArray(val) && val.length > 0) {
            const valEquipments = []
            for await (const equip of val) {
                valEquipments.push(equip.name)
            }

            val = valEquipments.join(', ')
        }

        else {
            val = ''
        }
    }

    else if (item.fieldName === 'orList') {
        if (val.length === 0) {
            val = null
        }
        else {
            val = val.map((orVal) => {
                const orData = {
                    'OR number': orVal.orNumber,
                    'OR Amount': orVal.orAmount
                }
                return Object.entries(orData).map((keyValue) => ` ${keyValue.join(': ')}`)
            })
            return val.join(", ")
                .trim()
                .replace(/\s+/gu, ' ')
        }
    }

    return val
}

schema.methods.handleHistoryValues = async function (item, valueType = 'previous') {
    let value = this[`${item.fieldName}`]

    if (valueType === 'previous') {
        value = this._original[`${item.fieldName}`]
    }

    const specialCases = [
        'campus',
        'departments',
        'members',
        'equipments',
        'orList'
    ]

    const isDateList = [
        'expectedStartDate',
        'expectedCompletionDate',
        'actualStartDate',
        'actualCompletionDate',
        'dateOfInvitation',
        'bidOpening',
        'dateOfAward',
        'dateOfNoticeToProceed',
        'negotiatedProcurementDate'
    ]

    if (specialCases.includes(item.fieldName)) {
        value = await this.handleSpecialCaseValues(item, value)
    }

    // date guard
    else if (isDateList.includes(item.fieldName) && value && moment(value).isValid()) {
        value = moment(value).format('YYYY-MM-DD')
    }
    // attachment guards
    else if (value && typeof value === 'object') {
        if (Object.keys(value).length === 0) {
            value = null
        }
        else if (value.originalname) {
            value = value.originalname
        }
    }

    return value
}

schema.methods.saveHistory = async function (items, user) {
    const { History } = connection.models
    const historyPromises = []

    for await (const item of items) {
        let info = {
            model: 'project',
            modelId: this._id,
            name: this.title,
            userId: user._id,
            userFullName: `${user.firstName} ${user.lastName}`,
            userProfilePicture: user.profilePicture,
            activities: `Update ${sentenceCase(item.fieldName)}.`
        }

        const noAdditionalInfoFields = [ 'remarks' ]

        const hasPreviousAndUpdatedValues = !noAdditionalInfoFields.includes(item.fieldName)

        if (hasPreviousAndUpdatedValues) {
            const updateValue = await this.handleHistoryValues(item, 'updated')

            const previousValue = await this.handleHistoryValues(item, 'previous')

            info = {
                ...info,
                previous: previousValue ? `${previousValue}` : '',
                updated: updateValue ? `${updateValue}` : ''
            }

        }

        historyPromises.push(History.create(info))
    }

    await Promise.all(historyPromises)
}

schema.methods.handleHistory = async function () {
    const { History, User } = connection.models

    if(!this._revision.author.doc) {
        return
    }

    const user = await User.findById(this._revision.author.doc)

    if (this.isNew) {
        await History.create({
            model: 'project',
            modelId: this._id,
            name: this.title,
            userId: user._id,
            userFullName: `${user.firstName} ${user.lastName}`,
            userProfilePicture: user.profilePicture,
            activities: `Create Project "${this.title}".`
        })
    }

    else if (!this.isNew) {
        let modifiedList = []
        modifiedList = [
            'description',
            'objective',
            'projectType',
            'departments',
            'members',
            'expectedStartDate',
            'expectedCompletionDate',
            'actualStartDate',
            'actualCompletionDate',
            'status',
            'campus',
            'location',
            'fundingSource',
            'nameOfContractor',
            'contractorProjectEngineer',
            'remarks',
            'equipments',
            'numberOfExtensionDays',
            'extensionBasis',
            'dateOfInvitation',
            'bidOpening',
            'dateOfAward',
            'dateOfNoticeToProceed',
            'orList',
            'gaaAmount',
            'abc',
            'contractCost',
            'billingSchedule',
            'biddingStatus',
            'negotiatedProcurementDate'
        ]

        if (this.isAttachment) {
            modifiedList = [
                'termsOfReference',
                'contract',
                'noticeToProceed',
                'billOfQuantity'
            ]
        }

        const modifiedListOfObjects = modifiedList.map((item) => {
            let value = this.isModified(item)

            if (item === 'remarks') {
                value = this.isRemarksUpdated
            }

            else if (item === 'equipments') {
                value = this.isEquipmentUpdated
            }

            return {
                value,
                fieldName: item
            }
        }).filter((item) => item.value)

        if (!modifiedListOfObjects.length) {
            return
        }

        await this.saveHistory(modifiedListOfObjects, user)
    }
}

schema.methods.handleIsRemarksUpdated = function() {
    const isDeletion = this._status === "deleted" || (this._revision && this._revision.description.includes('Deleted'))

    if (!this.isNew && !isDeletion) {
        this.isRemarksUpdated = this.remarks && this.remarks.length > 0
    }
}

schema.methods.handleAbc = async function(projectType) {
    if (!this.isNew) {
        if (!projectType.isBOQ) {
            return
        }
        const { LineItemBudget } = connection.models
        const { grandTotal } = await LineItemBudget.findOne({
            project: sanitize(this._id)
        })
        if (this.abc < grandTotal) {
            throw new Error(`BOQ grand total should not be greater than the ABC amount..`)
        }
    }
}

// pre hook that will handle additional "this" info
schema.pre('save', function(next) {
    this.isEquipmentUpdated = false

    this.isRemarksUpdated = false

    this.handleIsRemarksUpdated()

    next()
})

schema.pre('save', async function (next) {
    if (this.isCron) {
        next()

        return
    }
    else if (this.isAttachment) {
        await this.handleAttachments()
    }
    else if(!this.isAttachment) {
        if(this._status === "deleted" || (this._revision && this._revision.description.includes('Deleted'))) {
            await this.handleDeletion()
        }

        else {
            const { ProjectTask, ProjectType } = connection.models
            const projectType = await ProjectType.findById(this.projectType)

            const tasks = await Promise.all(this.tasks.map((task) => ProjectTask.findById(task)))

            await this.handleAbc(projectType)

            this.handleDates()

            await this.handleStatus(tasks)

            await this.handleDepartment(projectType)

            await this.validateMembersDepartment(projectType)

            await this.validateUpdateMembers(tasks)

            this.validateTasks()

            this.validateLineItemBudget()

            this.validateActualExpenses()

            validateBudgetManagement(this.isModified('budgetManagement'), this._revision)

            this.handleRemarks()

            this.validateAbc(projectType)

            await this.handleEquipmentSideEffect()

            this.wasNew = this.isNew
        }
    }

    await this.handleHistory()

    await this.sendEmailToProjectCreator()

    next()
})

const updateMonthlyProjectStatus = async function(doc) {
    const { LineItemBudget, ActualExpenses } = connection.models
    const billOfQuantityDoc = await LineItemBudget.findById(doc.lineItemBudget)

    if (billOfQuantityDoc && billOfQuantityDoc.isBOQ) {
        const actualExpensesDoc = doc.actualExpenses ? await ActualExpenses.findById(doc.actualExpenses) : null

        const projectInfo = {
            projectDoc: doc,
            billOfQuantityDoc,
            actualExpensesDoc
        }

        await setCurrentProjectStatus([ projectInfo ])
    }
}

const updateIPIMMonthlyReport = async function (doc) {
    const { IPIMMonthlyReport, ProjectMonthlyStatus } = connection.models
    const currentMonth = getMonthName(moment().month())
    const currentYear = moment().year()
    const reportingMonth = `${currentMonth}-${currentYear}`

    const [ monthlyReport ] = await IPIMMonthlyReport.find({
        projectId: doc._id,
        reportingMonth
    })

    const [ projectStatus ] = await ProjectMonthlyStatus.find({
        projectId: doc._id,
        reportingMonth
    })

    if (monthlyReport && projectStatus) {
        const updateValue = {
        }

        for (const key in JSON.parse(JSON.stringify(projectStatus))) {
            if (projectStatus[`${key}`] || projectStatus[`${key}`] === 0) {
                updateValue[`${key}`] = projectStatus[`${key}`]
            }
        }

        delete updateValue._id
        delete updateValue._status
        delete updateValue.__v

        if (Object.keys(updateValue).length) {
            const updatedMonthlyReport = Object.assign(monthlyReport, updateValue)

            await updatedMonthlyReport.save()
        }
    }

}

// eslint-disable-next-line prefer-arrow-callback
schema.post('save', async function (doc) {
    await updateMonthlyProjectStatus(doc)

    await updateIPIMMonthlyReport(doc)
})

schema.statics.deleteUserMappingValidation = async (userIds) => {
    const { Project } = connection.models

    const projectsFound = await Project.countDocuments({
        $expr: {
            $or: [
                {
                    $gt: [
                        {
                            $size: {
                                $setIntersection: [
                                    userIds,
                                    "$members"
                                ]
                            }
                        },
                        0
                    ]
                },
                {
                    $in: [
                        '$createdBy',
                        userIds
                    ]
                }
            ]

        }
    })

    if(projectsFound) {
        throw new Error('User is mapped to Projects.')
    }
}

const lookupRemarks = [
    {
        $unwind: {
            path: '$remarks',
            preserveNullAndEmptyArrays: true
        }
    },
    {
        $lookup: {
            from: 'users',
            let: {
                authorId: '$remarks.author'
            },
            pipeline: [
                {
                    $match: {
                        _status: {
                            $ne: 'deleted'
                        },
                        $expr: {
                            $eq: [
                                '$$authorId',
                                '$_id'
                            ]
                        }
                    }
                },
                {
                    $project: {
                        _id: '$_id',
                        name: {
                            $concat: [
                                '$firstName',
                                ' ',
                                '$lastName'
                            ]
                        },
                        picture: '$profilePicture'
                    }
                }
            ],
            as: 'remarks.author'
        }
    },
    {
        $unwind: {
            path: '$remarks.author',
            preserveNullAndEmptyArrays: true
        }
    },
    {
        $addFields: {
            remarks: {
                _id: '$remarks._id',
                message: '$remarks.message',
                date: {
                    $dateToString: {
                        date: '$remarks.date',
                        timezone,
                        format: dateFormat,
                        onNull: '$$REMOVE'
                    }
                },
                author: '$remarks.author'
            }
        }
    },
    {
        $addFields: {
            remarks: {
                $cond: [
                    {
                        $eq: [
                            '$remarks',
                            {
                            }
                        ]
                    },
                    '$$REMOVE',
                    '$remarks'
                ]
            }
        }
    }
]

const lookupProjectTasks = () => {
    // eslint-disable-next-line no-shadow
    const handleUploadedBy = [
        ...lookupUnwind({
            from: 'users',
            localField: 'documents.uploadedBy',
            as: 'uploadedBy',
            unwind: false
        }),
        {
            $addFields: {
                fromDocumentsFixed: {
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
                documents: {
                    $map: {
                        input: "$documents",
                        as: 'document',
                        in: {
                            $mergeObjects: [
                                "$$document",
                                {
                                    $arrayElemAt: [
                                        {
                                            $filter: {
                                                input: "$fromDocumentsFixed",
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
    ]

    const projection = [
        {
            $project: {
                _id: 1,
                assignTo: {
                    $map: {
                        input: '$assignTo',
                        as: 'user',
                        in: {
                            _id: '$$user._id',
                            name: {
                                $concat: [
                                    '$$user.firstName',
                                    ' ',
                                    '$$user.lastName'
                                ]
                            },
                            picture: '$$user.profilePicture',
                            email: '$$user.email'
                        }
                    }
                },
                _status: 1,
                title: 1,
                description: 1,
                status: 1,
                remarks: 1,
                dateCreated: {
                    $dateToString: {
                        date: '$dateCreated',
                        format: dateFormat,
                        timezone
                    }
                },
                expectedStartDate: {
                    $dateToString: {
                        date: '$expectedStartDate',
                        format: dateFormat,
                        timezone
                    }
                },
                expectedCompletionDate: {
                    $dateToString: {
                        date: '$expectedCompletionDate',
                        format: dateFormat,
                        timezone
                    }
                },
                actualStartDate: {
                    $dateToString: {
                        date: '$actualStartDate',
                        format: dateFormat,
                        timezone
                    }
                },
                actualCompletionDate: {
                    $dateToString: {
                        date: '$actualCompletionDate',
                        format: dateFormat,
                        timezone
                    }
                },
                createdBy: {
                    _id: '$createdBy._id',
                    name: {
                        $concat: [
                            '$createdBy.firstName',
                            ' ',
                            '$createdBy.lastName'
                        ]
                    },
                    picture: '$createdBy.profilePicture',
                    email: '$createdBy.email'
                },
                documents: {
                    $map: {
                        input: '$documents',
                        as: 'document',
                        in: {
                            _id: '$$document._id',
                            fieldname: '$$document.fieldname',
                            originalname: '$$document.originalname',
                            encoding: '$$document.encoding',
                            mimetype: '$$document.mimetype',
                            destination: '$$document.destination',
                            filename: '$$document.filename',
                            path: '$$document.path',
                            size: '$$document.size',
                            uploadDate: {
                                $dateToString: {
                                    date: '$$document.uploadDate',
                                    timezone,
                                    format: '%Y-%m-%d %H:%M:%S',
                                    onNull: '$$REMOVE'
                                }
                            },
                            uploadedBy: '$$document.uploadedBy',
                            fullName: '$$document.fullName',
                            userId: '$$document.userId'
                        }
                    }
                }
            }
        }
    ]

    const grouping = {
        $group: {
            _id: '$_id',
            assignTo: {
                $first: '$assignTo'
            },
            _status: {
                $first: '$_status'
            },
            title: {
                $first: '$title'
            },
            description: {
                $first: '$description'
            },
            status: {
                $first: '$status'
            },
            remarks: {
                $push: '$remarks'
            },
            dateCreated: {
                $first: '$dateCreated'
            },
            expectedStartDate: {
                $first: '$expectedStartDate'
            },
            expectedCompletionDate: {
                $first: '$expectedCompletionDate'
            },
            actualStartDate: {
                $first: '$actualStartDate'
            },
            actualCompletionDate: {
                $first: '$actualCompletionDate'
            },
            createdBy: {
                $first: '$createdBy'
            },
            documents: {
                $first: '$documents'
            }
        }
    }

    const lookupMain = [
        {
            $unwind: {
                path: '$tasks',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'projecttasks',
                let: {
                    taskId: '$tasks'
                },
                pipeline: [
                    {
                        $match: {
                            _status: {
                                $ne: 'deleted'
                            },
                            $expr: {
                                $eq: [
                                    '$$taskId',
                                    '$_id'
                                ]
                            }
                        }
                    },
                    ...lookupUnwind({
                        from: 'users',
                        localField: 'createdBy'
                    }),
                    ...lookupUnwind({
                        from: 'users',
                        localField: 'assignTo',
                        unwind: false
                    }),
                    ...lookupRemarks,
                    ...handleUploadedBy,
                    ...projection,
                    grouping
                ],
                as: 'tasks'
            }
        },
        {
            $unwind: {
                path: '$tasks',
                preserveNullAndEmptyArrays: true
            }
        }
    ]

    return lookupMain
}

const lookupCampus = [
    {
        $lookup: {
            from: 'campus',
            let: {
                campus: '$campus'
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $eq: [
                                '$_id',
                                '$$campus'
                            ]
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        fadChief: 1,
                        director: 1
                    }
                }
            ],
            as: 'campus'
        }
    },
    {
        $unwind: {
            path: '$campus',
            preserveNullAndEmptyArrays: true
        }
    }
]

const lookupMasterData = [
    ...lookupUnwind({
        from: 'departments',
        localField: 'departments',
        unwind: false
    }),
    ...lookupUnwind({
        from: 'projecttypes',
        localField: 'projectType'
    }),
    ...lookupCampus
]

const firstGroupLIB = {
    $group: {
        _id: '$_id',
        isBOQ: {
            $first: '$isBOQ'
        },
        _status: {
            $first: '$_status'
        },
        project: {
            $first: '$project'
        },
        budgets: {
            $push: '$budgets'
        },
        createdBy: {
            $first: '$createdBy'
        },
        updatedBy: {
            $first: '$updatedBy'
        },
        initialVersion: {
            $first: '$initialVersion'
        },
        dateCreated: {
            $first: '$dateCreated'
        },
        dateUpdated: {
            $first: '$dateUpdated'
        },
        grandTotal: {
            $first: '$grandTotal'
        },
        isEdited: {
            $first: '$isEdited'
        },
        revision: {
            $first: '$revision'
        }
    }
}

const secondGroupLIB = {
    $group: {
        _id: '$_id',
        isBOQ: {
            $first: '$isBOQ'
        },
        _status: {
            $first: '$_status'
        },
        project: {
            $first: '$project'
        },
        budgets: {
            $first: '$budgets'
        },
        createdBy: {
            $first: '$createdBy'
        },
        updatedBy: {
            $first: '$updatedBy'
        },
        initialVersion: {
            $push: '$initialVersion'
        },
        dateCreated: {
            $first: '$dateCreated'
        },
        dateUpdated: {
            $first: '$dateUpdated'
        },
        grandTotal: {
            $first: '$grandTotal'
        },
        isEdited: {
            $first: '$isEdited'
        },
        revision: {
            $first: '$revision'
        }
    }
}

const lookupLineItemBudget = [
    {
        $lookup: {
            from: 'lineitembudgets',
            let: {
                itemBudget: '$lineItemBudget'
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $eq: [
                                '$_id',
                                '$$itemBudget'
                            ]
                        }
                    }
                },
                {
                    $unwind: {
                        path: '$budgets',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        'budgets.items': {
                            $map: {
                                input: '$budgets.items',
                                in: {
                                    _id: "$$this._id",
                                    name: "$$this.name",
                                    quantity: "$$this.quantity",
                                    unit: "$$this.unit",
                                    amount: "$$this.amount",
                                    pshsFund: "$$this.pshsFund",
                                    otherFund: "$$this.otherFund",
                                    remarks: "$$this.remarks",
                                    expectedStartDate: {
                                        $dateToString: {
                                            date: "$$this.expectedStartDate",
                                            timezone,
                                            format: "%Y-%m-%d",
                                            onNull: "$$REMOVE"
                                        }
                                    },
                                    expectedCompletionDate: {
                                        $dateToString: {
                                            date: "$$this.expectedCompletionDate",
                                            timezone,
                                            format: "%Y-%m-%d",
                                            onNull: "$$REMOVE"
                                        }
                                    },
                                    weightEquivalent: "$$this.weightEquivalent",
                                    total: "$$this.total"
                                }
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        'budgets.expectedStartDate': {
                            $dateToString: {
                                date: '$budgets.expectedStartDate',
                                timezone,
                                format: '%Y-%m-%d',
                                onNull: '$$REMOVE'
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        'budgets.expectedCompletionDate': {
                            $dateToString: {
                                date: '$budgets.expectedCompletionDate',
                                timezone,
                                format: '%Y-%m-%d',
                                onNull: '$$REMOVE'
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 1,
                        isBOQ: 1,
                        _status: 1,
                        project: 1,
                        budgets: 1,
                        createdBy: 1,
                        updatedBy: 1,
                        initialVersion: 1,
                        dateCreated: 1,
                        dateUpdated: 1,
                        grandTotal: 1,
                        isEdited: 1,
                        revision: 1
                    }
                },
                firstGroupLIB,
                {
                    $unwind: {
                        path: '$initialVersion',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        'initialVersion.items': {
                            $map: {
                                input: '$initialVersion.items',
                                in: {
                                    _id: "$$this._id",
                                    name: "$$this.name",
                                    quantity: "$$this.quantity",
                                    unit: "$$this.unit",
                                    amount: "$$this.amount",
                                    pshsFund: "$$this.pshsFund",
                                    otherFund: "$$this.otherFund",
                                    remarks: "$$this.remarks",
                                    expectedStartDate: {
                                        $dateToString: {
                                            date: "$$this.expectedStartDate",
                                            timezone,
                                            format: "%Y-%m-%d",
                                            onNull: "$$REMOVE"
                                        }
                                    },
                                    expectedCompletionDate: {
                                        $dateToString: {
                                            date: "$$this.expectedCompletionDate",
                                            timezone,
                                            format: "%Y-%m-%d",
                                            onNull: "$$REMOVE"
                                        }
                                    },
                                    weightEquivalent: "$$this.weightEquivalent",
                                    total: "$$this.total"
                                }
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        'initialVersion.expectedStartDate': {
                            $dateToString: {
                                date: '$initialVersion.expectedStartDate',
                                timezone,
                                format: '%Y-%m-%d',
                                onNull: '$$REMOVE'
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        'initialVersion.expectedCompletionDate': {
                            $dateToString: {
                                date: '$initialVersion.expectedCompletionDate',
                                timezone,
                                format: '%Y-%m-%d',
                                onNull: '$$REMOVE'
                            }
                        }
                    }
                },
                secondGroupLIB
            ],
            as: 'lineItemBudget'
        }
    },
    {
        $unwind: {
            path: '$lineItemBudget',
            preserveNullAndEmptyArrays: true
        }
    }
]

const firstGroupActualExpenses = {
    $group: {
        _id: '$_id',
        isBOQ: {
            $first: '$isBOQ'
        },
        _status: {
            $first: '$_status'
        },
        project: {
            $first: '$project'
        },
        expenses: {
            $push: '$expenses'
        },
        createdBy: {
            $first: '$createdBy'
        },
        updatedBy: {
            $first: '$updatedBy'
        },
        dateCreated: {
            $first: '$dateCreated'
        },
        dateUpdated: {
            $first: '$dateUpdated'
        }
    }
}

const lookupActualExpenses = [
    {
        $lookup: {
            from: 'actualexpenses',
            let: {
                actualExpenses: '$actualExpenses'
            },
            pipeline: [
                {
                    $match: {
                        $expr: {
                            $eq: [
                                '$_id',
                                '$$actualExpenses'
                            ]
                        }
                    }
                },
                {
                    $unwind: {
                        path: '$expenses',
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $addFields: {
                        'expenses.items': {
                            $map: {
                                input: '$expenses.items',
                                in: {
                                    _id: "$$this._id",
                                    name: "$$this.name",
                                    quantity: "$$this.quantity",
                                    previousQuantity: "$$this.previousQuantity",
                                    unit: "$$this.unit",
                                    actualExpenses: "$$this.actualExpenses",
                                    remarks: "$$this.remarks",
                                    total: "$$this.total",
                                    weightEquivalent: "$$this.weightEquivalent",
                                    actualStartDate: {
                                        $dateToString: {
                                            date: "$$this.actualStartDate",
                                            timezone,
                                            format: "%Y-%m-%d",
                                            onNull: "$$REMOVE"
                                        }
                                    },
                                    actualCompletionDate: {
                                        $dateToString: {
                                            date: "$$this.actualCompletionDate",
                                            timezone,
                                            format: "%Y-%m-%d",
                                            onNull: "$$REMOVE"
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        'expenses.actualStartDate': {
                            $dateToString: {
                                date: '$expenses.actualStartDate',
                                timezone,
                                format: '%Y-%m-%d',
                                onNull: '$$REMOVE'
                            }
                        }
                    }
                },
                {
                    $addFields: {
                        'expenses.actualCompletionDate': {
                            $dateToString: {
                                date: '$expenses.actualCompletionDate',
                                timezone,
                                format: '%Y-%m-%d',
                                onNull: '$$REMOVE'
                            }
                        }
                    }
                },
                firstGroupActualExpenses
            ],
            as: 'actualExpenses'
        }
    },
    {
        $unwind: {
            path: '$actualExpenses',
            preserveNullAndEmptyArrays: true
        }
    }
]

const lookupsDefault = [
    ...lookupUnwind({
        from: 'users',
        localField: 'createdBy'
    }),
    ...lookupUnwind({
        from: 'users',
        localField: 'updatedBy'
    }),
    ...lookupUnwind({
        from: 'users',
        localField: 'members',
        unwind: false
    }),
    ...lookupLineItemBudget,
    ...lookupActualExpenses,
    ...lookupProjectTasks(),
    ...lookupMasterData,
    ...formatAttachment('termsOfReference'),
    ...formatAttachment('contract'),
    ...formatAttachment('noticeToProceed'),
    ...formatAttachment('billOfQuantity')
]

const projectDefault = (query) => {
    const {
        count = 99999,
        start = 0,
        sortBy = 'title',
        secondSortBy = 'title',
        asc = 1
    } = query
    const projection = {
        $project: {
            title: 1,
            objective: 1,
            description: 1,
            projectType: {
                _id: '$projectType._id',
                name: '$projectType.name'
            },
            departments: {
                $map: {
                    input: '$departments',
                    in: {
                        _id: '$$this._id',
                        name: '$$this.name'
                    }
                }
            },
            createdBy: {
                _id: '$createdBy._id',
                name: getFullName('$createdBy'),
                picture: '$createdBy.profilePicture'
            },
            updatedBy: {
                _id: '$updatedBy._id',
                name: getFullName('$updatedBy'),
                picture: '$updatedBy.profilePicture'
            },
            members: {
                $map: {
                    input: '$members',
                    as: 'member',
                    in: {
                        _id: '$$member._id',
                        name: {
                            $concat: [
                                '$$member.firstName',
                                ' ',
                                '$$member.lastName'
                            ]
                        },
                        picture: '$$member.profilePicture',
                        userRole: '$$member.userRole'
                    }
                }
            },
            dateCreated: 1,
            dateUpdated: 1,
            actualStartDate: 1,
            actualCompletionDate: 1,
            expectedStartDate: {
                $dateToString: {
                    date: '$expectedStartDate',
                    timezone: timezone,
                    format: dateFormat
                }
            },
            expectedCompletionDate: {
                $dateToString: {
                    date: '$expectedCompletionDate',
                    timezone: timezone,
                    format: dateFormat
                }
            },
            finance: 1,
            status: 1,
            id: {
                $function: {
                    body: `function(id) {
                        return id.toString().padStart(3, '0')
                    }`,
                    args: [ '$id' ],
                    lang: 'js'
                }
            },
            tasks: 1,
            _status: 1,
            biddingStatus: 1,
            negotiatedProcurementDate: {
                $dateToString: {
                    date: '$negotiatedProcurementDate',
                    timezone: timezone,
                    format: dateFormat
                }
            },
            totalTasks: 1,
            lineItemBudget: 1,
            actualExpenses: 1,
            accountingManagement: 1,
            budgetManagement: 1,
            cashManagement: 1,
            equipments: 1,
            remarks: 1,
            campus: 1,
            termsOfReference: 1,
            contract: 1,
            noticeToProceed: 1,
            billOfQuantity: 1,
            fundingSource: 1,
            nameOfContractor: 1,
            contractorProjectEngineer: 1,
            location: 1,
            suspensionDate: 1,
            daysSuspended: 1,
            numberOfExtensionDays: 1,
            extensionBasis: 1,
            dateOfInvitation: 1,
            bidOpening: 1,
            dateOfAward: 1,
            dateOfNoticeToProceed: 1,
            gaaAmount: 1,
            abc: 1,
            contractCost: 1,
            orList: 1,
            billingSchedule: 1,
            budgetOfficer: 1
        }
    }

    const grouping = {
        $group: {
            _id: '$_id',
            title: {
                $first: '$title'
            },
            objective: {
                $first: '$objective'
            },
            description: {
                $first: '$description'
            },
            projectType: {
                $first: '$projectType'
            },
            biddingStatus: {
                $first: '$biddingStatus'
            },
            negotiatedProcurementDate: {
                $first: '$negotiatedProcurementDate'
            },
            departments: {
                $first: '$departments'
            },
            createdBy: {
                $first: '$createdBy'
            },
            updatedBy: {
                $first: '$updatedBy'
            },
            members: {
                $first: '$members'
            },
            dateCreated: {
                $first: '$dateCreated'
            },
            dateUpdated: {
                $first: '$dateUpdated'
            },
            actualStartDate: {
                $first: '$actualStartDate'
            },
            actualCompletionDate: {
                $first: '$actualCompletionDate'
            },
            expectedStartDate: {
                $first: '$expectedStartDate'
            },
            expectedCompletionDate: {
                $first: '$expectedCompletionDate'
            },
            status: {
                $first: '$status'
            },
            id: {
                $first: '$id'
            },
            _status: {
                $first: '$_status'
            },
            tasks: {
                $push: '$tasks'
            },
            totalTasks: {
                $first: '$totalTasks'
            },
            lineItemBudget: {
                $first: '$lineItemBudget'
            },
            actualExpenses: {
                $first: '$actualExpenses'
            },
            accountingManagement: {
                $first: '$accountingManagement'
            },
            budgetManagement: {
                $first: '$budgetManagement'
            },
            cashManagement: {
                $first: '$cashManagement'
            },
            equipments: {
                $first: '$equipments'
            },
            remarks: {
                $first: '$remarks'
            },
            campus: {
                $first: '$campus'
            },
            termsOfReference: {
                $first: '$termsOfReference'
            },
            contract: {
                $first: '$contract'
            },
            noticeToProceed: {
                $first: '$noticeToProceed'
            },
            billOfQuantity: {
                $first: '$billOfQuantity'
            },
            fundingSource: {
                $first: '$fundingSource'
            },
            nameOfContractor: {
                $first: '$nameOfContractor'
            },
            contractorProjectEngineer: {
                $first: '$contractorProjectEngineer'
            },
            location: {
                $first: '$location'
            },
            suspensionDate: {
                $first: '$suspensionDate'
            },
            daysSuspended: {
                $first: '$daysSuspended'
            },
            numberOfExtensionDays: {
                $first: '$numberOfExtensionDays'
            },
            extensionBasis: {
                $first: '$extensionBasis'
            },
            dateOfInvitation: {
                $first: '$dateOfInvitation'
            },
            bidOpening: {
                $first: '$bidOpening'
            },
            dateOfAward: {
                $first: '$dateOfAward'
            },
            dateOfNoticeToProceed: {
                $first: '$dateOfNoticeToProceed'
            },
            gaaAmount: {
                $first: '$gaaAmount'
            },
            abc: {
                $first: '$abc'
            },
            contractCost: {
                $first: '$contractCost'
            },
            orList: {
                $first: '$orList'
            },
            billingSchedule: {
                $first: '$billingSchedule'
            },
            budgetOfficer: {
                $first: '$budgetOfficer'
            },
            finance: {
                $first: '$finance'
            }
        }
    }

    const secondGrouping = {
        $group: {
            ...grouping.$group,
            remarks: {
                $push: '$remarks'
            },
            tasks: {
                $first: '$tasks'
            }
        }
    }

    return [
        ...lookupsDefault,
        projection,
        {
            $sort: {
                [`tasks.${sortBy}`]: parseInt(asc, 10) === 1 ? 1 : -1,
                [`tasks.${secondSortBy}`]: 1
            }
        },
        {
            $skip: parseInt(start, 10)
        },
        {
            $limit: parseInt(count, 10)
        },
        grouping,
        ...lookupRemarks,
        secondGrouping
    ]
}

const projectTable = [
    ...lookupUnwind({
        from: 'projecttypes',
        localField: 'projectType'
    }),
    {
        $project: {
            id: {
                $function: {
                    body: `function(id) {
                        return id.toString().padStart(3, '0')
                    }`,
                    args: [ '$id' ],
                    lang: 'js'
                }
            },
            title: 1,
            status: 1,
            projectType: '$projectType.name',
            expectedCompletionDate: {
                $dateToString: {
                    date: '$expectedCompletionDate',
                    timezone: timezone,
                    format: dateFormat
                }
            },
            expectedStartDate: {
                $dateToString: {
                    date: '$expectedStartDate',
                    timezone: timezone,
                    format: dateFormat
                }
            }
        }
    }
]

const defaultAgg = [
    matchNotDeleted(),
    //dates
    ...aggregationHelper.to12HourString({
        fieldName: 'dateCreated'
    }),
    ...aggregationHelper.to12HourString({
        fieldName: 'dateUpdated'
    }),
    ...aggregationHelper.to12HourString({
        fieldName: 'actualStartDate',
        includeTime: false
    }),
    ...aggregationHelper.to12HourString({
        fieldName: 'actualCompletionDate',
        includeTime: false
    }),
    ...aggregationHelper.to12HourString({
        fieldName: 'dateOfInvitation',
        includeTime: false
    }),
    ...aggregationHelper.to12HourString({
        fieldName: 'bidOpening',
        includeTime: false
    }),
    ...aggregationHelper.to12HourString({
        fieldName: 'dateOfAward',
        includeTime: false
    }),
    ...aggregationHelper.to12HourString({
        fieldName: 'dateOfNoticeToProceed',
        includeTime: false
    })
]

const aggregateRemainingBudget = [
    {
        $addFields: {
            totalBudget: '$lineItemBudget.grandTotal',
            totalExpenses: {
                $ifNull: [
                    '$actualExpenses.grandTotal',
                    0
                ]
            },
            remainingBudget: {
                $subtract: [
                    '$lineItemBudget.grandTotal',
                    {
                        $ifNull: [
                            '$actualExpenses.grandTotal',
                            0
                        ]
                    }
                ]
            }
        }
    },
    {
        $addFields: {
            remainingBudgetPercent: {
                $cond: {
                    if: {
                        $eq: [
                            '$totalExpenses',
                            0
                        ]
                    },
                    then: '100',
                    else: {
                        $substr: [
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            {
                                                $divide: [
                                                    '$remainingBudget',
                                                    '$totalBudget'
                                                ]
                                            },
                                            100
                                        ]
                                    },
                                    2
                                ]
                            },
                            0,
                            6
                        ]
                    }
                }
            },
            totalExpensesPercent: {
                $cond: {
                    if: {
                        $eq: [
                            '$totalExpenses',
                            0
                        ]
                    },
                    then: '0',
                    else: {
                        $substr: [
                            {
                                $round: [
                                    {
                                        $multiply: [
                                            {
                                                $divide: [
                                                    '$totalExpenses',
                                                    '$totalBudget'
                                                ]
                                            },
                                            100
                                        ]
                                    },
                                    2
                                ]
                            },
                            0,
                            6
                        ]
                    }
                }
            }
        }
    },
    {
        $addFields: {
            remainingBudgetPercent: {
                $cond: {
                    if: {
                        $and: [
                            {
                                $lt: [
                                    '$remainingBudget',
                                    0
                                ]
                            },
                            {
                                $ne: [
                                    '$totalExpenses',
                                    0
                                ]
                            }
                        ]
                    },
                    then: '0',
                    else: '$remainingBudgetPercent'
                }
            },
            exceedExpenses: {
                $cond: {
                    if: {
                        $and: [
                            {
                                $lt: [
                                    '$remainingBudget',
                                    0
                                ]
                            },
                            {
                                $ne: [
                                    '$totalExpenses',
                                    0
                                ]
                            }
                        ]
                    },
                    then: {
                        $subtract: [
                            '$totalExpenses',
                            '$totalBudget'
                        ]
                    },
                    else: 0
                }
            },
            isExpensesExceededBudget: {
                $cond: {
                    if: {
                        $and: [
                            {
                                $lt: [
                                    '$remainingBudget',
                                    0
                                ]
                            },
                            {
                                $ne: [
                                    '$totalExpenses',
                                    0
                                ]
                            }
                        ]
                    },
                    then: true,
                    else: false
                }
            },
            remainingBudget: {
                $cond: {
                    if: {
                        $and: [
                            {
                                $lt: [
                                    '$remainingBudget',
                                    0
                                ]
                            },
                            {
                                $ne: [
                                    '$totalExpenses',
                                    0
                                ]
                            }
                        ]
                    },
                    then: 0,
                    else: '$remainingBudget'
                }
            }
        }
    }
]

const projectRemainingBudget = {
    $project: {
        _id: 1,
        title: 1,
        totalBudget: 1,
        remainingBudgetPercent: 1,
        totalExpenses: 1,
        totalExpensesPercent: 1,
        remainingBudget: 1,
        exceedExpenses: 1,
        isExpensesExceededBudget: 1
    }
}

const filterByDate = (params) => {
    const { quarter } = params
    let { year } = params
    if (!isNaN(quarter)) {
        const validQuarters = [
            '1',
            '2',
            '3',
            '4'
        ]

        if (!validQuarters.includes(quarter)) {
            throw new Error("Invalid Quarter")
        }

        if (!year) {
            year = new Date(Date.now())
                .getFullYear()
                .toString()
        }

        return [
            {
                $addFields: {
                    yearAndQuarterCreated: {
                        $concat: [
                            '$yearCreated',
                            '$quarterCreated'
                        ]
                    }
                }
            },
            {
                $match: {
                    $or: [
                        {
                            $and: [
                                {
                                    $expr: {
                                        $eq: [
                                            '$isOpen',
                                            true
                                        ]
                                    }
                                },
                                {
                                    $expr: {
                                        $lte: [
                                            '$yearAndQuarterCreated',
                                            `${year}${quarter}`
                                        ]
                                    }
                                }
                            ]
                        },
                        {
                            $and: [
                                {
                                    $expr: {
                                        $eq: [
                                            '$quarterCompleted',
                                            quarter
                                        ]
                                    }
                                },
                                {
                                    $expr: {
                                        $eq: [
                                            '$yearCompleted',
                                            year
                                        ]
                                    }
                                }
                            ]
                        }
                    ]
                }
            }
        ]
    }

    else if (!isNaN(year)) {
        return [
            {
                $match: {
                    $or: [
                        {
                            $and: [
                                {
                                    $expr: {
                                        $eq: [
                                            '$isOpen',
                                            true
                                        ]
                                    }
                                },
                                {
                                    yearCreated: {
                                        $lte: year
                                    }
                                }
                            ]
                        },
                        {
                            $expr: {
                                $eq: [
                                    '$yearCompleted',
                                    year
                                ]
                            }
                        }
                    ]
                }
            }
        ]
    }

    return []
}

schema.statics.dataView = {
    default: function (session, query) {
        const { user, userRole } = session

        let roleFilter = [
            {
                $match: {
                    _status: 'active',
                    $or: [
                        {
                            members: new ObjectId(user)
                        },
                        {
                            createdBy: new ObjectId(user)
                        }
                    ]
                }
            }
        ]

        if (userRole.includes('superadmin')) {
            roleFilter = [
                {
                    $match: {
                        _status: 'active'
                    }
                }
            ]
        }

        return [
            ...roleFilter,
            {
                $addFields: {
                    totalTasks: {
                        $size: '$tasks'
                    }
                }
            },
            ...defaultAgg,
            ...projectDefault(query)
        ]
    },
    table: function (session, query) {
        const { quarter, year, projectType } = query
        const { user, userRole } = session

        let roleFilter = [
            {
                $match: {
                    $or: [
                        {
                            members: new ObjectId(user)
                        },
                        {
                            createdBy: new ObjectId(user)
                        }
                    ]
                }
            }
        ]

        if (userRole.includes('superadmin')) {
            roleFilter = []
        }

        let projectTypeFilter = []

        if (projectType) {
            projectTypeFilter = [
                {
                    $match: {
                        projectType: projectType
                    }
                }
            ]
        }

        return [
            {
                $match: {
                    _status: 'active'
                }
            },
            ...roleFilter,
            {
                $addFields: {
                    quarterCreated: {
                        $toString: {
                            $trunc: {
                                $add: [
                                    {
                                        $divide: [
                                            {
                                                $subtract: [
                                                    {
                                                        $month: "$dateCreated"
                                                    },
                                                    1
                                                ]
                                            },
                                            3
                                        ]
                                    },
                                    1
                                ]
                            }
                        }
                    },
                    yearCreated: {
                        $toString: {
                            $year: {
                                date: "$dateCreated",
                                timezone
                            }
                        }
                    },
                    quarterCompleted: {
                        $toString: {
                            $trunc: {
                                $add: [
                                    {
                                        $divide: [
                                            {
                                                $subtract: [
                                                    {
                                                        $month: "$actualCompletionDate"
                                                    },
                                                    1
                                                ]
                                            },
                                            3
                                        ]
                                    },
                                    1
                                ]
                            }
                        }
                    },
                    yearCompleted: {
                        $toString: {
                            $year: {
                                date: "$actualCompletionDate",
                                timezone
                            }
                        }
                    },
                    isOpen: {
                        $cond: [
                            {
                                $in: [
                                    '$status',
                                    [
                                        'Completed',
                                        'Terminated'
                                    ]
                                ]
                            },
                            false,
                            true
                        ]
                    }
                }
            },
            ...filterByDate({
                quarter,
                year
            }),
            ...defaultAgg,
            ...projectTable,
            ...projectTypeFilter
        ]
    },
    dashboard: function (session, aggregation) {
        const { user } = session

        const roleFilter = [
            {
                $match: {
                    _status: 'active',
                    $or: [
                        {
                            members: new ObjectId(user)
                        },
                        {
                            createdBy: new ObjectId(user)
                        }
                    ]
                }
            }
        ]

        const notYetStarted = [
            ...roleFilter,
            {
                $match: {
                    status: 'Not Yet Started'
                }
            }
        ]
        const active = [
            ...roleFilter,
            {
                $match: {
                    status: 'Active'
                }
            }
        ]
        const onHold = [
            ...roleFilter,
            {
                $match: {
                    status: 'On Hold'
                }
            }
        ]
        const completed = [
            ...roleFilter,
            {
                $match: {
                    status: 'Completed'
                }
            }
        ]
        const overdue = [
            ...roleFilter,
            {
                $match: {
                    status: 'Overdue'
                }
            }
        ]
        const suspended = [
            ...roleFilter,
            {
                $match: {
                    status: 'Suspended'
                }
            }
        ]
        const terminated = [
            ...roleFilter,
            {
                $match: {
                    status: 'Terminated'
                }
            }
        ]

        return [
            {
                $facet: {
                    projects: [
                        ...roleFilter,
                        {
                            $project: {
                                id: 1,
                                title: 1,
                                dateCreated: {
                                    $dateToString: {
                                        date: '$dateCreated',
                                        timezone: timezone,
                                        format: dateFormat
                                    }
                                },
                                status: 1
                            }
                        },
                        ...aggregation
                    ],
                    allProjects: [ ...roleFilter ],
                    notYetStarted,
                    active,
                    onHold,
                    completed,
                    overdue,
                    suspended,
                    terminated
                }
            }
        ]
    },
    // used in webapi/dashboard/overdue
    overdue: function (session, aggregation) {
        const { user } = session

        const matchObj = (memberField = 'members') => ({
            _status: 'active',
            status: 'Overdue',
            $or: [
                {
                    [`${memberField}`]: new ObjectId(user)
                },
                {
                    createdBy: new ObjectId(user)
                }
            ]
        })

        return [
            {
                $facet: {
                    overdueProjects: [
                        {
                            $match: matchObj()
                        },
                        {
                            $project: {
                                _id: 1,
                                title: 1,
                                dateCreated: {
                                    $dateToString: {
                                        date: '$dateCreated',
                                        timezone: timezone,
                                        format: dateFormat
                                    }
                                },
                                status: 1,
                                model: 'project'
                            }
                        }
                    ],
                    overdueTasks: [
                        ...lookupUnwind({
                            from: 'projecttasks',
                            localField: 'tasks',
                            preserve: false
                        }),
                        {
                            $replaceRoot: {
                                newRoot: '$tasks'
                            }
                        },
                        {
                            $match: matchObj('assignTo')
                        },
                        {
                            $project: {
                                _id: 1,
                                title: 1,
                                status: 1,
                                dateCreated: {
                                    $dateToString: {
                                        date: '$dateCreated',
                                        timezone: timezone,
                                        format: dateFormat
                                    }
                                },
                                model: 'task',
                                project: '$project'
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    overdues: {
                        $concatArrays: [
                            '$overdueProjects',
                            '$overdueTasks'
                        ]
                    }
                }
            },
            {
                $unwind: '$overdues'
            },
            {
                $replaceRoot: {
                    newRoot: '$overdues'
                }
            },
            ...aggregation
        ]
    },
    remainingBudget: function (session) {
        const { user, userRole } = session

        let roleFilter = [
            {
                $match: {
                    _status: 'active',
                    $or: [
                        {
                            members: new ObjectId(user)
                        },
                        {
                            createdBy: new ObjectId(user)
                        }
                    ]
                }
            }
        ]

        if (userRole.includes('superadmin')) {
            roleFilter = [
                {
                    $match: {
                        _status: 'active'
                    }
                }
            ]
        }
        return [
            ...roleFilter,
            ...lookupUnwind({
                from: 'lineitembudgets',
                localField: 'lineItemBudget'
            }),
            ...lookupUnwind({
                from: 'actualexpenses',
                localField: 'actualExpenses'
            }),
            ...aggregateRemainingBudget,
            projectRemainingBudget
        ]
    },
    documents: [
        ...handleUploadedBy('documents'),
        {
            $project: {
                documents: {
                    $map: {
                        input: '$documents',
                        as: 'document',
                        in: {
                            _id: '$$document._id',
                            documentId: '$_id',
                            fieldname: '$$document.fieldname',
                            originalname: '$$document.originalname',
                            encoding: '$$document.encoding',
                            mimetype: '$$document.mimetype',
                            destination: '$$document.destination',
                            filename: '$$document.filename',
                            path: '$$document.path',
                            size: '$$document.size',
                            uploadDate: {
                                $dateToString: {
                                    date: '$$document.uploadDate',
                                    timezone,
                                    format: '%Y-%m-%d %H:%M:%S',
                                    onNull: '$$REMOVE'
                                }
                            },
                            uploadedBy: '$$document.uploadedBy',
                            fullName: '$$document.fullName',
                            userId: '$$document.userId'
                        }
                    }
                }
            }
        },
        {
            $unwind: '$documents'
        },
        {
            $replaceRoot: {
                newRoot: '$documents'
            }
        }
    ]
}

schema.statics.upload = {
    termsOfReference: {
        dest: 'files',
        folder: 'document',
        mimeTypes: [
            "image/jpeg",
            "image/png",
            "application/pdf",
            "application/vnd.ms-excel",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        maxCount: 1,
        maxFileUploadSize
    },
    contract: {
        dest: 'files',
        folder: 'document',
        mimeTypes: [
            "image/jpeg",
            "image/png",
            "application/pdf",
            "application/vnd.ms-excel",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        maxCount: 1,
        maxFileUploadSize
    },
    noticeToProceed: {
        dest: 'files',
        folder: 'document',
        mimeTypes: [
            "image/jpeg",
            "image/png",
            "application/pdf",
            "application/vnd.ms-excel",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        maxCount: 1,
        maxFileUploadSize
    },
    billOfQuantity: {
        dest: 'files',
        folder: 'document',
        mimeTypes: [
            "image/jpeg",
            "image/png",
            "application/pdf",
            "application/vnd.ms-excel",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        maxCount: 1,
        maxFileUploadSize: 105857600
    },
    documents: {
        dest: 'files',
        folder: 'document',
        mimeTypes: [
            "image/jpeg",
            "image/png",
            "application/pdf",
            "application/vnd.ms-excel",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        maxCount: 50,
        maxFileUploadSize: 105857600
    }
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [
            'id',
            'title',
            'status',
            'expectedCompletionDate',
            'expectedStartDate'
        ]

        return generateSearch(search, searchAttributes)
    },
    table: function (search) {
        const searchAttributes = [
            'id',
            'title',
            'status',
            'expectedCompletionDate',
            'expectedStartDate'
        ]

        return generateSearch(search, searchAttributes)
    },
    dashboard: function (search) {
        const searchAttributes = [
            'id',
            'title',
            'dateCreated'
        ]

        return generateSearch(search, searchAttributes)
    },
    overdue: function (search) {
        const searchAttributes = [
            'title',
            'dateCreated'
        ]

        return generateSearch(search, searchAttributes)
    },
    documents: function (search) {
        const searchAttributes = [
            'fullName',
            'originalname',
            'uploadDate'
        ]

        return generateSearch(search, searchAttributes)
    }
}
schema.plugin(autopopulate)
schema.plugin(
    AutoIncrement,
    {
        id: 'project_seq',
        // eslint-disable-next-line camelcase
        inc_field: 'id'
    }
)

const modifiedSchema = schemaFactory(schema)

const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'Project'
})

module.exports = model