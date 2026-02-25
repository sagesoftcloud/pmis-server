/***
 * File name: campus.test.js
 *
 * Program Description:
 * This file includes tests for campus creation testing process.
*/

const request = require('supertest')
const app = require('../../app')
const router = request.agent(app)
const data = require('../data/campus.js')
const { admin } = require('../data/loginCreds')

let newCampusId = ''

beforeAll(async (done) => {
    await router
        .get('/webapi/user/account/logout')
    await router
        .post('/webapi/user/account/login?forceful=true')
        .send({
            ...admin,
            testing: true
        })

    done()
})

afterAll(async (done) => {
    const session = await router
        .post('/webapi/user/account/session')
    if(session.body.message === 'User session has been updated.') {
        await router
            .get('/webapi/user/account/logout')
    }
    done()
})

describe('Create a Project Type', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .post('/webapi/campus')
            .send(data)

        const { entry, message } = res.body
        const { _id, name, code, director, fadChief } = entry

        expect(res.statusCode).toEqual(201)
        expect(message).toEqual("Created an entry for Campus.")
        expect(name).toEqual(data.name)
        expect(code).toEqual(data.code)
        expect(director).toEqual(data.director)
        expect(fadChief).toEqual(data.fadChief)

        newCampusId = _id

        done()
    }, 50000)
})

describe('View a Project Type', () => {
    it('with "admin" user role', async (done) => {
        const resAll = await router
            .get('/webapi/campus')

        expect(resAll.statusCode).toEqual(200)
        expect(resAll.body.total).toBeGreaterThan(0)

        const res = await router
            .get(`/webapi/campus/${newCampusId}`)
        expect(res.statusCode).toEqual(200)

        const { code, name, director, fadChief } = res.body.entry

        expect(name).toEqual(data.name)
        expect(code).toEqual(data.code)
        expect(director).toEqual(data.director)
        expect(fadChief).toEqual(data.fadChief)

        done()
    }, 50000)
})

describe('Edit a Project', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .patch(`/webapi/campus/${newCampusId}`)
            .send({
                name: "Updated"
            })

        expect(res.statusCode).toEqual(200)
        expect(res.body.updatedResult.name).toEqual("Updated")

        done()
    }, 50000)
})

describe('Delete a Department', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .delete(`/webapi/campus/${newCampusId}`)

        expect(res.statusCode).toEqual(200)
        expect(res.body.message).toEqual('Campus has been successfully deleted from the database.')

        done()
    }, 50000)
})