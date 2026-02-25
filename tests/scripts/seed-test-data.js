/* eslint-disable no-console */
const models = require('../../src/models')
const { sentenceCase } = require('../../src/lib/utils')
const db = require('mongodb-plugin')
const { dbURL, appData } = require('../../src/config')
const { initialDeactivationReasons } = require('../../src/config/meta')

const modelSeeder = async (model, array, keyNameChecker = '') => {
    console.log(`Seeding ${sentenceCase(model)}.`)
    let arr = []

    if (keyNameChecker) {
        await Promise.all(array.map(async(item) => {
            try {
                const projectDoc = await models[`${model}`].findOne({
                    [`${keyNameChecker}`]: item[`${keyNameChecker}`]
                })
                if (!projectDoc) {
                    arr.push(item)
                }
            }
            catch(err) {
                console.log(err)
            }
        }))
    }
    else {
        arr = array
    }

    await Promise.all(arr.map(async(item) => {
        try {
            await models[`${model}`].create({
                ...item
            })
        }
        catch(err) {
            console.log(err)
        }
    }))

    console.log(`${sentenceCase(model)} seeding done.`)
}

const modelCleanup = async (model) => {
    console.log(`Deleting all entry for ${sentenceCase(model)}.`)
    try {
        await models[`${model}`].deleteMany({
        })
    }
    catch (error) {
        console.log(error)
    }
}

const projectTypes = [
    {
        name: 'Infrastructure/Construction Project',
        description: 'Sample description'
    },
    {
        name: 'Consulting Service',
        description: 'Sample description'
    },
    {
        name: 'Event Management',
        description: 'Sample description'
    }
]

const departments = [
    {
        name: 'Sample Department 1',
        description: 'Sample description'
    },
    {
        name: 'Sample Department 2',
        description: 'Sample description'
    },
    {
        name: 'Sample Department 3',
        description: 'Sample description'
    },
    {
        name: 'Sample Department 4',
        description: 'Sample description'
    },
    {
        name: 'Sample Department 5',
        description: 'Sample description'
    }
]

const initialConfiguration = [
    {
        deactivationReasons: [ ...initialDeactivationReasons ]
    }
]

const itemTypes = [
    {
        name: "Meals"
    },
    {
        name: "Honorarium"
    },
    {
        name: "Awards"
    },
    {
        name: "Courier Service"
    },
    {
        name: "Souvenirs"
    }
]

const seed = async () => {
    // Project Type
    console.log('Seeding test data.')
    const database = db.createConnection({
        uri: dbURL,
        name: `${appData.title.toUpperCase()} Database`
    })

    // project type
    await modelSeeder('projectType', projectTypes, 'name')

    // departments
    await modelSeeder('department', departments, 'name')

    // app configurations
    await modelCleanup('appConfiguration')
    await modelSeeder('appConfiguration', initialConfiguration, 'name')

    // itemTypes
    await modelCleanup('itemType')
    await modelSeeder('itemType', itemTypes, 'name')

    console.log('Seeding test data done.')
    console.log('Closing database.')
    await database.close()
    console.log('Database successfully closed.')
}

seed()