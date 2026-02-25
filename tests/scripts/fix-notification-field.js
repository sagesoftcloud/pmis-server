/* eslint-disable no-process-exit */
/* eslint-disable no-console */
const db = require('mongodb-plugin')
const { dbURL, appData } = require('../../src/config')
const userModel = require('../../src/models/user')

const database = db.createConnection({
    uri: dbURL,
    name: `${appData.title.toUpperCase()} Database`
})

const fixOverdueNotifField = async () => {
    await userModel.updateMany({
    }, {
        $set: {
            overdueNotification: 'always'
        },
        $unset: {
            overdueReminder: ''
        }
    })

    await database.close()
    process.exit(0)
}

fixOverdueNotifField()