/* eslint-disable no-extra-parens */
/***
 * File name: projectTask.js
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
 * - model: The Project Task model with statics and configurations.
 */

/* eslint-disable require-await */
// Rule is needed to be disabled for Mongoose
/* eslint-disable no-invalid-this */
// Rule is needed to be disabled for the ObjectId to be parsed correctly
/* eslint-disable new-cap */
const { Schema, Types, connection } = require('mongoose')
const { schemaFactory, modelFactory } = require('mongodb-plugin')
const { ObjectId } = Types
const moment = require('moment')

const {
    padDates = true,
    padTimes = true,
    maxFileUploadSize,
    timezone,
    dateFormat,
    HARD_DELETE
} = require('../config/meta')
const aggregationHelper = require('../lib/aggregationHelpers')({
    padDates,
    padTimes
})

const attachment = require('../schema/attachment')
const autopopulate = require('mongoose-autopopulate')
const {
    generateSearch,
    lookupUnwind,
    getFullName,
    matchNotDeleted,
    handleUploadedBy
} = require('./lib/utils')
const { transporter } = require('../config/auth')
const { appData, protocol, domain } = require('../config')
const { unlinkFileFromFilePath } = require('../lib/utils')

const schema = new Schema(
    {
        title: {
            type: String,
            required: [
                true,
                'Project Task Title is required.'
            ],
            maxLength: [
                40,
                'Project Task Title cannot exceed 40 characters.'
            ]
        },
        description: {
            type: String,
            required: [
                true,
                'Description is required.'
            ]
        },
        status: {
            type: String,
            required: [
                true,
                'Project Status is required.'
            ],
            enum: [
                'Not Yet Started',
                'Active',
                'On Hold',
                'Overdue',
                'Completed'
            ]
        },
        assignTo: {
            type: [ ObjectId ],
            ref: 'User'
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
                        type: String,
                        required: [
                            true,
                            'Remarks message is required'
                        ]
                    }
                }
            ]
        },

        project: {
            type: ObjectId,
            required: [
                true,
                'Project is required.'
            ],
            ref: 'Project',
            immutable: true
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
        documents: [ attachment ],
        archivedFiles: [ attachment ],
        expectedStartDate: {
            type: Date
        },
        expectedCompletionDate: {
            type: Date
        },
        actualStartDate: {
            type: Date
        },
        actualCompletionDate: {
            type: Date
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

schema.statics.hardDelete = HARD_DELETE.PROJECT_TASK

schema.methods.handleProject = async function() {
    const { History, Project, User } = connection.models
    const project = await Project.findById(this.project)
    const user = await User.findById(this._revision.author.doc)

    if(!project) {
        throw new Error("Project not found")
    }

    if(this.isNew) {
        if(project.status === 'Completed') {
            throw new Error('Cannot add task. Project status is completed.')
        }

        await Project.findByIdAndUpdate(this.project, {
            $push: {
                tasks: this._id
            }
        })

        if (!user) {
            return
        }

        await History.create({
            model: 'project',
            modelId: project._id,
            name: project.title,
            userId: user._id,
            userFullName: `${user.firstName} ${user.lastName}`,
            userProfilePicture: user.profilePicture,
            activities: `Create Project Task "${this.title}"`
        })
    }

    else if (!this.isNew) {
        if (!user) {
            return
        }
        await History.create({
            model: 'project',
            modelId: project._id,
            name: project.title,
            userId: user._id,
            userFullName: `${user.firstName} ${user.lastName}`,
            userProfilePicture: user.profilePicture,
            activities: `Update Project Task "${this.title}"`
        })
    }
}

schema.methods.handleRemarks = async function() {
    const author = this._revision.author.doc

    let originalRemarks = []
    if(this._original) {
        originalRemarks = this._original.remarks
    }

    // used JSON stringify and parse was done because data cannot be mapped
    const thisRemarks = JSON.parse(JSON.stringify(this.remarks))
    this.remarks = thisRemarks.map((remark) => ({
        ...remark,
        author
    }))

    const newRemarks = [
        ...originalRemarks,
        ...this.remarks
    ]

    this.remarks = [ ...newRemarks ]
}

const getProjectMembersString = async (project) => {
    let projectMembers = [ project.createdBy ]
    if(project.members && project.members.length) {
        projectMembers = [
            ...projectMembers,
            ...project.members
        ]
    }
    const projectMembersString = projectMembers.map((member) => member.toString())

    return projectMembersString
}

schema.methods.handleAssignTo = async function (project) {
    if(this.assignTo && this.assignTo.length) {
        const assignToString = this.assignTo.map((asignee) => asignee.toString())
        const projectMembersString = await getProjectMembersString(project)

        const isSubArr = new Set([
            ...assignToString,
            ...projectMembersString
        ]).size === projectMembersString.length

        if(!isSubArr) {
            throw new Error('Only project members can be assigned to a projectTask.')
        }
    }
}

schema.methods.validateCreate = async function (project) {
    if(this.isNew) {
        const { User } = connection.models
        const projectMembersString = await getProjectMembersString(project)
        const createdByString = this.createdBy.toString()
        const { userRole } = await User.findById(this.createdBy)

        if(!projectMembersString.includes(createdByString) && !userRole.includes('superadmin')) {
            throw new Error('Only project members can create a task.')
        }
    }
}

schema.methods.validateUpdate = async function () {
    const { ProjectTask, User } = connection.models
    const author = this._revision.author.doc

    if(!this.isNew && author) {
        const user = await User.findById(author)

        if (user && user.userRole.includes('superadmin')) {
            return
        }

        const currentDoc = await ProjectTask.findById(this._id)

        let members = [ currentDoc.createdBy ]
        if(currentDoc.assignTo) {
            members = [
                ...members,
                ...currentDoc.assignTo
            ]
        }

        const membersString = members.map((member) => member.toString())
        const authorString = author.toString()

        if(!membersString.includes(authorString)) {
            if (this.isModified('remarks')) {
                throw new Error('Only task members can add remarks.')
            }
            throw new Error('Only task members can edit a task.')
        }
    }
}

schema.methods.handleDates = function () {
    if(this.expectedStartDate && this.expectedCompletionDate) {
        const expectedStartDate = moment(this.expectedStartDate)
            .format('YYYY-MM-DD')
        const expectedCompletionDate = moment(this.expectedCompletionDate)
            .format('YYYY-MM-DD')

        if(expectedStartDate > expectedCompletionDate) {
            throw new Error('Expected start date cannot be greater than the expected completion date.')
        }
    }

    if(this.isModified('status')) {
        if(this.status === "Active") {
            this.actualStartDate = Date.now()
        }

        else if(this.status === "Completed") {
            this.actualCompletionDate = Date.now()

            if (!this.actualStartDate) {
                this.actualStartDate = Date.now()
            }
        }
    }
}

schema.methods.handleStatus = function () {
    if(this.isNew) {
        const allowedStatuses = [
            'Not Yet Started',
            'Active'
        ]

        if(!allowedStatuses.includes(this.status)) {
            throw new Error('Invalid status.')
        }
    }

    else if(!this.isNew) {
        if(this.isModified('status')) {
            if(this._original.status === 'Active' && this.status === 'Not Yet Started') {
                throw new Error('Invalid status.')
            }

            else if (this._original.status === 'Completed') {
                throw new Error('Invalid status.')
            }
        }
        else if (this.status === "Completed") {
            throw new Error('Completed project task cannot be edited.')
        }
    }
}

// will only send email to creator if the editor is not the creator of the project
schema.methods.sendEmailToProjectCreator = async function (project) {
    const editor = this._revision.author.doc
    const createdBy = project.createdBy.toString()

    if (!editor) {
        return
    }

    if (editor.toString() !== createdBy.toString()) {
        const { User } = connection.models

        const authorDoc = await User.findById(editor).exec()
        const createdByDoc = await User.findById(createdBy).exec()
        let isModifiedList = []

        isModifiedList = [ 'title' ]

        if (this.isAttachment) {
            isModifiedList = [ 'documents' ]
        }

        const isModifiedListOfObjects = isModifiedList.map((item) => ({
            value: this.isModified(item),
            fieldName: item
        }))

        const isModified = isModifiedListOfObjects.find((item) => item.value)

        if (isModified || this.isNew || this._status === "deleted" || (this._revision && this._revision.description.includes('Deleted'))) {
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

schema.methods.handeDeletion = async function() {
    const { Project } = connection.models

    if (this.documents && this.documents.length) {
        for await(const document of this.documents) {
            await unlinkFileFromFilePath(document, (err) => {
                if (err) {
                    throw new Error(err)
                }
            })
        }
    }

    if (this.archivedFiles && this.archivedFiles.length) {
        for await(const document of this.archivedFiles) {
            await unlinkFileFromFilePath(document, (err) => {
                if (err) {
                    throw new Error(err)
                }
            })
        }
    }

    await Project.findByIdAndUpdate(this.project, {
        $pull: {
            tasks: this._id
        }
    })
}

schema.pre('save', async function (next) {
    const { Project } = connection.models
    const project = await Project.findById(this.project)

    if (this.isAttachment) {
        // do nothing
    }

    else if(this._status === "deleted" || this._revision.description.includes('Deleted')) {
        await this.handeDeletion(project)
    }

    else if(!this.isAttachment) {
        await this.validateCreate(project)

        await this.validateUpdate()

        await this.handleRemarks()

        // await this.handleAssignTo(project)

        this.handleDates()

        this.handleStatus()

        // side effects (should be handled last)
        await this.handleProject(project)
    }

    await this.sendEmailToProjectCreator(project)

    next()
})

const lookups = [
    ...lookupUnwind({
        from: 'users',
        localField: 'assignTo',
        unwind: false
    }),
    ...lookupUnwind({
        from: 'users',
        localField: 'createdBy'
    }),
    ...lookupUnwind({
        from: 'users',
        localField: 'updatedBy'
    })
]

const projectDefault = [
    {
        $project: {
            __v: 0
        }
    },
    {
        $project: {
            _id: 1,
            remarks: 1,
            _status: 1,
            title: 1,
            description: 1,
            status: 1,
            project: 1,
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
            },
            assignTo: {
                $map: {
                    input: '$assignTo',
                    as: 'user',
                    in: {
                        _id: '$$user._id',
                        fullName: {
                            $concat: [
                                '$$user.firstName',
                                ' ',
                                '$$user.lastName'
                            ]
                        },
                        profilePicture: '$$user.profilePicture',
                        email: '$$user.email'
                    }
                }

            },
            dateCreated: 1,
            dateUpdated: 1,
            expectedStartDate: 1,
            expectedCompletionDate: 1,
            actualStartDate: 1,
            actualCompletionDate: 1,
            createdBy: {
                _id: '$createdBy._id',
                name: getFullName('$createdBy')
            },
            updatedBy: {
                _id: '$updatedBy._id',
                name: getFullName('$updatedBy')
            }
        }
    }
]

schema.statics.dataView = {
    default: async function (session) {
        const { user, userRole } = session

        let roleFilter = [
            {
                $match: {
                    _status: 'active',
                    $or: [
                        {
                            assignTo: new ObjectId(user)
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
            ...aggregationHelper.to12HourString({
                fieldName: 'dateCreated',
                includeTime: false
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'dateUpdated',
                includeTime: false
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'expectedStartDate',
                includeTime: false
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'expectedCompletionDate',
                includeTime: false
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'actualStartDate',
                includeTime: false
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'actualCompletionDate',
                includeTime: false
            }),
            ...lookups,
            ...handleUploadedBy('documents'),
            ...projectDefault
        ]
    },
    table: async function (session) {
        const { user, userRole } = session

        let roleFilter = [
            {
                $match: {
                    _status: 'active',
                    $or: [
                        {
                            assignTo: new ObjectId(user)
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
            ...aggregationHelper.to12HourString({
                fieldName: 'dateCreated',
                includeTime: false
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'dateUpdated',
                includeTime: false
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'expectedStartDate',
                includeTime: false
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'expectedCompletionDate',
                includeTime: false
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'actualStartDate',
                includeTime: false
            }),
            ...aggregationHelper.to12HourString({
                fieldName: 'actualCompletionDate',
                includeTime: false
            }),
            ...lookups,
            ...projectDefault
        ]
    },
    projectAssignees: [
        matchNotDeleted(),
        ...lookupUnwind({
            from: 'users',
            localField: 'assignTo',
            foreignField: '_id',
            as: 'assignTo',
            preserve: false
        }),
        matchNotDeleted('assignTo._status'),
        {
            $group: {
                _id: '$assignTo'
            }
        },
        {
            $project: {
                _id: '$_id._id',
                fullName: getFullName('$_id')
            }
        }
    ],
    documents: [
        matchNotDeleted(),
        ...handleUploadedBy('documents'),
        {
            $project: {
                documents: {
                    $map: {
                        input: '$documents',
                        as: 'document',
                        in: {
                            _id: '$$document._id',
                            title: '$title',
                            taskId: '$_id',
                            fieldname: '$$document.fieldname',
                            originalname: '$$document.originalname',
                            encoding: '$$document.encoding',
                            mimetype: '$$document.mimetype',
                            destination: '$$document.destination',
                            filename: '$$document.filename',
                            path: '$$document.path',
                            size: '$$document.size',
                            project: '$project',
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
    ],
    archivedFiles: [
        matchNotDeleted(),
        ...handleUploadedBy('archivedFiles'),
        {
            $project: {
                archivedFiles: {
                    $map: {
                        input: '$archivedFiles',
                        as: 'document',
                        in: {
                            _id: '$$document._id',
                            title: '$title',
                            taskId: '$_id',
                            fieldname: '$$document.fieldname',
                            originalname: '$$document.originalname',
                            encoding: '$$document.encoding',
                            mimetype: '$$document.mimetype',
                            destination: '$$document.destination',
                            filename: '$$document.filename',
                            path: '$$document.path',
                            size: '$$document.size',
                            project: '$project',
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
            $unwind: '$archivedFiles'
        },
        {
            $replaceRoot: {
                newRoot: '$archivedFiles'
            }
        }
    ],
    overdue: function (session, aggregation) {
        const { user, userRole } = session

        let roleFilter = [
            {
                $match: {
                    _status: 'active',
                    status: 'Overdue',
                    $or: [
                        {
                            assignTo: new ObjectId(user)
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
                        _status: 'active',
                        status: 'Overdue'
                    }
                }
            ]
        }

        return [
            ...roleFilter,
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
                    }
                }
            },
            ...aggregation
        ]
    }
}

schema.statics.upload = {
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
        maxFileUploadSize
    }
}

schema.statics.search = {
    default: function (search) {
        const searchAttributes = [
            'title',
            'status',
            'description',
            'projectCategory',
            'project.title'
        ]

        return generateSearch(search, searchAttributes)
    },
    table: function (search) {
        const searchAttributes = [
            'title',
            'status',
            'description',
            'projectCategory',
            'project.title'
        ]

        return generateSearch(search, searchAttributes)
    },
    documents: function (search) {
        const searchAttributes = [
            'title',
            'uploadedBy',
            'fullName',
            'originalname',
            'uploadDate'
        ]

        return generateSearch(search, searchAttributes)
    },
    archivedFiles: function (search) {
        const searchAttributes = [
            'title',
            'uploadedBy',
            'fullName',
            'originalname',
            'uploadDate'
        ]

        return generateSearch(search, searchAttributes)
    },
    overdue: function (search) {
        const searchAttributes = [
            'title',
            'dateCreated'
        ]

        return generateSearch(search, searchAttributes)
    }
}
schema.plugin(autopopulate)
const modifiedSchema = schemaFactory(schema)
schema.index(modifiedSchema.index({
    title: 1,
    project: 1
}, {
    unique: true
}))

const model = modelFactory({
    schema: modifiedSchema,
    modelName: 'ProjectTask'
})
module.exports = model