const projectModel = require('../models/project')
const ipimBillingInformationModel = require('../models/ipimBillingInformation')
const userModel = require('../models/user')

const { Types } = require('mongoose')
const { ObjectId } = Types
const { formatQuery } = require("../lib/utils")

const validateCreateBody = async (body) => {
    const modifiedBody = body

    const { projectId, checkOrReferenceNumber, billingNumber } = modifiedBody

    if (!projectId) {
        throw new Error("Project id is required.")
    }

    if (!billingNumber) {
        throw new Error("Project id is required.")
    }

    if (!checkOrReferenceNumber) {
        throw new Error("Check No./Reference No. is required.")
    }

    const project = await projectModel.findById(projectId)

    if (!project) {
        throw new Error("Project does not exist.")
    }

    if (project.status === 'Completed') {
        throw new Error('Project is Completed.')
    }

    else if (project.status === 'Terminated') {
        throw new Error('Project is Terminated.')
    }

    const [ existingReport ] = await ipimBillingInformationModel.find({
        projectId,
        checkOrReferenceNumber,
        billingNumber
    })

    if (existingReport) {
        throw new Error('Billing information already exists.')
    }

    return modifiedBody
}

const ipimBillingInformationService = {
    create: async ({ body, user }) => {
        const info = await validateCreateBody(body)

        const userDoc = await userModel.findById(user)

        const entry = await ipimBillingInformationModel.create({
            ...info,
            createdBy: new ObjectId(userDoc._id),
            updatedBy: new ObjectId(userDoc._id),
            _revision: {
                author: {
                    userModel: userModel.constructor.modelName,
                    doc: new ObjectId(userDoc._id)
                },
                description: `Created a document for IPIM Billing Information by ${userDoc.firstName} ${userDoc.middleName ? `${userDoc.middleName}` : ''} ${userDoc.lastName}.`
            }
        })

        return {
            message: 'Created an entry for IPIM Billing Information.',
            entry
        }
    },
    view: async ({ params, query, session }) => {
        const { _projectId } = params

        let customQuery = {
        }

        let pipeline = []

        const {
            key = null,
            value = null,
            advancedQuery,
            start = 0,
            count = 999999,
            sortBy = 'billingNumber',
            secondSortBy = '_id',
            asc = 1,
            total = false,
            dataview = 'default',
            search
        } = query

        let dataViewQuery = ipimBillingInformationModel.dataView[`${dataview}`] || []
        if (typeof ipimBillingInformationModel.dataView[`${dataview}`] === 'function') {
            dataViewQuery = await ipimBillingInformationModel.dataView[`${dataview}`](session, query)
        }

        if(key !== null && value !== null) {
            customQuery = {
                [key]: value
            }
        }
        else if(advancedQuery) {
            customQuery = formatQuery(JSON
                .parse(decodeURIComponent(advancedQuery)))
        }
        pipeline = pipeline
            .concat([
                ...dataViewQuery,
                {
                    $match: customQuery
                }
            ])

        pipeline = [
            {
                $match: {
                    projectId: _projectId
                }
            },
            ...pipeline
        ]

        if (search) {
            const defaultSearch = ipimBillingInformationModel.search ? ipimBillingInformationModel.search[`${dataview}`](search) : []
            pipeline = pipeline.concat([ ...defaultSearch ])
        }

        const entries = await ipimBillingInformationModel.aggregate([
            ...pipeline,
            {
                $project: {
                    _revision: 0
                }
            },
            {
                $sort: {
                    [sortBy]: parseInt(asc, 10) === 1 ? 1 : -1,
                    [secondSortBy]: 1
                }
            },
            {
                $skip: parseInt(start, 10)
            },
            {
                $limit: parseInt(count, 10)
            }

        ]).allowDiskUse(true)
        const allEntries = await ipimBillingInformationModel.aggregate(pipeline)

        return total
            ? {
                total: allEntries.length
            }
            : {
                entries,
                total: allEntries.length
            }
    }
}

module.exports = ipimBillingInformationService