/***
 * File name: department.test.js
 *
 * Program Description:
 * This file includes tests for department creation testing process.
*/

const request = require('supertest')
const app = require('../../app')
const router = request.agent(app)
const data = require('../data/department')
const { admin } = require('../data/loginCreds')

let newDepartmentId = ''

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

describe('Create a Department', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .post('/webapi/department')
            .send(data)

        const { entry, message } = res.body
        const { _id, name, description } = entry

        expect(res.statusCode).toEqual(201)
        expect(message).toEqual("Created an entry for Department.")
        expect(name).toEqual(data.name)
        expect(description).toEqual(data.description)

        newDepartmentId = _id

        done()
    }, 50000)
})

describe('View a Project', () => {
    it('with "admin" user role', async (done) => {
        const resAll = await router
            .get('/webapi/department')

        expect(resAll.statusCode).toEqual(200)
        expect(resAll.body.total).toBeGreaterThan(0)

        const res = await router
            .get(`/webapi/department/${newDepartmentId}`)
        expect(res.statusCode).toEqual(200)

        const { title, description, name } = res.body.entry

        expect(title).toEqual(data.title)
        expect(name).toEqual(data.name)
        expect(description).toEqual(data.description)

        done()
    }, 50000)
})

describe('Edit a Project', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .patch(`/webapi/department/${newDepartmentId}`)
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
            .delete(`/webapi/department/${newDepartmentId}`)

        expect(res.statusCode).toEqual(200)

        done()
    }, 50000)
})