/* eslint-disable no-console */
const { Authentication } = require('../../src/config/auth')
const {
    superAdminUserTemplate,
    adminUserTemplate,
    fadChiefUserTemplate,
    guestUserTemplate,
    accountingOfficerTemplate,
    budgetOfficerTemplate,
    directorTemplate,
    hrOfficerTemplate,
    inventoryOfficerTemplate,
    procurementOfficerTemplate,
    projectLeaderTemplate,
    cashierTemplate,
    defaultPassword
} = require('../../src/config/meta')
const userModel = require('../../src/models/user')
const departmentModel = require('../../src/models/department')
const { getNestedValue } = require('../../src/lib/utils')
const { usernamePath } = require('../../src/config/meta')

const createUser = async (template) => {
    const { firstName, middleName, lastName, userRole, email } = template
    const existingUser = await userModel.findOne({
        email
    })

    if(existingUser) {
        console.log(`Existing ${email} found.`)
        return
    }

    const newUser = await userModel.create({
        ...template,
        _revision: {
            author: {
                doc: null,
                userModel: userModel.constructor.modelName,
                userRole: userRole
            },
            description: `Created user named ${firstName}${middleName ? middleName : ''} ${lastName} by ${firstName}${middleName ? ` ${middleName}` : ''} ${lastName}.`
        }
    })

    const existingGuestAuth = await Authentication.findOne({
        _status: {
            $ne: 'deleted'
        },
        username: email
    })

    if(existingGuestAuth) {
        await Authentication.findByIdAndDelete(existingGuestAuth._id)
    }

    await Authentication.create({
        userDocument: newUser._id,
        collectionName: userModel.constructor.modelName,
        password: template.password,
        username: getNestedValue(newUser, usernamePath[`${userRole[0]}`]),
        email: {
            value: newUser.email,
            verified: true
        },
        userRole: userRole[0],
        _revision: {
            author: {
                doc: newUser._id,
                userModel: userModel.constructor.modelName,
                userRole: userRole[0]
            },
            description: `Created credentials for ${firstName}${middleName ? middleName : ''} ${lastName} by ${firstName}${middleName ? ` ${middleName}` : ''} ${lastName}.`
        }
    })
    console.log(`Created user and credentials for email named '${email}`)
}

const seed = async () => {
    try {
        const departmentDoc = await departmentModel.findOne({
            name: 'Test Department'
        })
        let doc = ''
        if (!departmentDoc) {
            doc = await departmentModel.create({
                name: 'Test Department',
                description: 'Sample description'
            })
        }

        const userTemplates = [
            guestUserTemplate,
            superAdminUserTemplate,
            adminUserTemplate,
            fadChiefUserTemplate,
            accountingOfficerTemplate,
            budgetOfficerTemplate,
            cashierTemplate,
            directorTemplate,
            hrOfficerTemplate,
            inventoryOfficerTemplate,
            procurementOfficerTemplate,
            projectLeaderTemplate
        ]

        await Promise.all(userTemplates.map((template) => createUser({
            ...template,
            department: doc ? doc._id : departmentDoc._id,
            password: defaultPassword
        })))
    }
    catch (error) {
        console.log(error)
    }

    // eslint-disable-next-line no-process-exit
    process.exit(0)
}

seed()