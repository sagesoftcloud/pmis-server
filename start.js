/* eslint-disable no-process-exit */
/* eslint-disable no-console */
const app = require('./app')

const { port } = require('./src/config')

const server = app.listen(port, () => {
    // Need to disable rule to display that Express.js is running already
    // eslint-disable-next-line no-console
    console.log(`Express is running on port ${server.address().port}.`)
})