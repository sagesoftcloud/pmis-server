/* eslint-disable no-process-exit */
/* eslint-disable no-console */
const db = require('mongodb-plugin')
const { dbURL, appData } = require('../../src/config')
const models = require('../../src/models')

const database = db.createConnection({
    uri: dbURL,
    name: `${appData.title.toUpperCase()} Database`
})

const fixProjectTypeIsBOQ = async () => {
    const projectTypeWithoutIsBOQ = await models.projectType.aggregate([
        {
            $match: {
                isBOQ: {
                    $exists: false
                }
            }
        }
    ])

    await Promise.all(projectTypeWithoutIsBOQ.map(async (projectType) => {
        await models.projectType.findByIdAndUpdate(
            projectType._id, 
            {           
                isBOQ: projectType.name === 'Infrastructure/Construction Project'            
            }
        )

        return projectType
    }))

    await database.close()
    process.exit(0)
}

fixProjectTypeIsBOQ()