/***
 * File name: smoketest.test.js
 *
 * Program Description:
 * This file includes tests for health checks in the testing process.
 */


// const request = require('supertest')
// const app = require('../../app')
// const router = request.agent(app)

// const { timeout } = require('./config')

describe.skip('Smoketest', () => {
    beforeAll((done) => {
        done()
    })

    afterAll(async (done) => {
        const login = await router
            .post('/webapi/user/account/login?forceful=true')
            .send({
                username: 'smoketest@mail.com',
                password: 'maroon12345',
                testing: true
            })
        const { userRole, user } = login.body
        await router
            .delete(`/webapi/admin/user/${userRole}/${user}`)
        await router
            .get('/webapi/user/account/logout')
        done()
    })

    beforeEach((done) => {
        done()
    })

    afterEach((done) => {
        done()
    })

    it.skip('Can generate the test route', async (done) => {
        const res = await router.get('/webapi/utilities/test')

        expect(res.statusCode).toEqual(200)
        expect(res.body.message).toEqual('Hello, world!')
        done()
    }, timeout.medium)

    it.skip('Can send email from the email test route', async (done) => {
        const res = await router.get('/webapi/utilities/emailtest')

        expect(res.statusCode).toEqual(200)
        expect(res.body.message).toEqual('Test email should have been sent.')
        done()
    }, timeout.medium)
})