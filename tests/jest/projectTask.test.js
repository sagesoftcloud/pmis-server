/***
 * File name: projectTask.test.js
 *
 * Program Description:
 * This file includes tests for projectTask creation testing process.
*/

const request = require('supertest')
const app = require('../../app')
const router = request.agent(app)
const data = require('../data/projectTask')
const projectData = require('../data/project')
const projectTypeData = require('../data/projectType')
const campusData = require('../data/campus')
const { admin } = require('../data/loginCreds')

let newProjectId = ''
let newProjectTypeDataId = ''
let newProjectTaskId = ''
let campusId = ''


beforeAll(async (done) => {
    await router
        .get('/webapi/user/account/logout')
    await router
        .post('/webapi/user/account/login?forceful=true')
        .send({
            ...admin,
            testing: true
        })

    const newProjectType = await router
        .post('/webapi/projectType')
        .send(projectTypeData)
    newProjectTypeDataId = newProjectType.body.entry._id

    const createdCampus = await router
        .post('/webapi/campus')
        .send(campusData)

    const { entry: campusEntry } = createdCampus.body

    campusId = campusEntry._id

    const newProject = await router
        .post('/webapi/project')
        .send({
            ...projectData,
            campus: campusId,
            projectType: newProjectTypeDataId
        })

    newProjectId = newProject.body.entry._id

    done()
})

afterAll(async (done) => {
    await router
        .delete(`/webapi/project/${newProjectId}`)
    await router
        .delete(`/webapi/projectType/${newProjectTypeDataId}`)

    await router
        .delete(`/webapi/campus/${campusId}`)

    const session = await router
        .post('/webapi/user/account/session')
    if(session.body.message === 'User session has been updated.') {
        await router
            .get('/webapi/user/account/logout')
    }
    done()
})

describe('Create a Project Task', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .post('/webapi/projectTask')
            .send({
                ...data,
                project: newProjectId
            })
        const { entry, message } = res.body
        const { _id } = entry

        expect(res.statusCode).toEqual(201)
        expect(message).toEqual('Created an entry for Project Task.')
        expect(entry.title).toEqual(data.title)
        expect(entry.status).toEqual(data.status)
        expect(entry.description).toEqual(data.description)

        newProjectTaskId = _id

        done()
    }, 50000)
})

describe('View a Project Task', () => {
    it('with "admin" user role', async (done) => {
        const resAll = await router
            .get('/webapi/projectTask')

        expect(resAll.statusCode).toEqual(200)
        expect(resAll.body.total).toBeGreaterThan(0)

        const res = await router
            .get(`/webapi/projectTask/${newProjectTaskId}`)

        expect(res.statusCode).toEqual(200)
        expect(res.body.entry.title).toEqual(data.title)
        expect(res.body.entry.status).toEqual(data.status)
        expect(res.body.entry.description).toEqual(data.description)

        done()
    })
})

describe('Edit a Project Task', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .patch(`/webapi/projectTask/${newProjectTaskId}`)
            .send({
                "title": "Updated"
            })

        expect(res.statusCode).toEqual(200)
        expect(res.body.updatedResult.title).toEqual("Updated")

        done()
    }, 50000)
})

describe('Delete a Project Task', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .delete(`/webapi/projectTask/${newProjectTaskId}`)

        expect(res.statusCode).toEqual(200)

        done()
    }, 50000)
})