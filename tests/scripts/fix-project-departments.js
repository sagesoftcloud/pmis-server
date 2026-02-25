/* eslint-disable no-process-exit */
/* eslint-disable no-console */
const db = require('mongodb-plugin')
const { dbURL, appData } = require('../../src/config')
const models = require('../../src/models')

const database = db.createConnection({
    uri: dbURL,
    name: `${appData.title.toUpperCase()} Database`
})

const fixDepartments = async () => {
    const projectsWithoutDepartments = await models.project.aggregate([
        {
            $match: {
                departments: {
                    $exists: false
                }
            }
        }
    ])

    await Promise.all(projectsWithoutDepartments.map(async (project) => {
        const departments = []
        if(project.department) {
            departments.push(project.department)
        }

        await models.project.findByIdAndUpdate(project._id, {
            $set: {
                departments
            }
        })

        return project
    }))

    await database.close()
    process.exit(0)
}

fixDepartments()