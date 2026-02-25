/* eslint-disable prefer-destructuring */
/***
 * File name: project.test.js
 *
 * Program Description:
 * This file includes tests for project creation testing process.
*/

const request = require('supertest')
const app = require('../../app')
const router = request.agent(app)
const data = require('../data/project')
const projectTypeData = require('../data/projectType')
const campusData = require('../data/campus')
const { admin } = require('../data/loginCreds')

let newProjectId = ''
let projectTypeDataId = ''
let remarkId = ''
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
        
    const createdCampus = await router
        .post('/webapi/campus')
        .send(campusData)

    const { entry: campusEntry } = createdCampus.body
    
    campusId = campusEntry._id

    const createdProjectType = await router
        .post('/webapi/projectType')
        .send(projectTypeData)

    const { entry } = createdProjectType.body
    projectTypeDataId = entry._id

    done()
})

afterAll(async (done) => {
    await router
        .delete(`/webapi/projectType/${projectTypeDataId}`)
    
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

describe('Create a Project', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .post('/webapi/project')
            .send({
                ...data,
                projectType: projectTypeDataId,
                campus: campusId
            })

        const { entry, message } = res.body
        const { _id, title, objective, description, projectType, remarks } = entry

        expect(res.statusCode).toEqual(201)
        expect(message).toEqual("Created an entry for Project.")
        expect(title).toEqual(data.title)
        expect(objective).toEqual(data.objective)
        expect(description).toEqual(data.description)
        expect(projectType.toString()).toEqual(projectTypeDataId.toString())
        expect(remarks.length).toEqual(1)

        remarkId = remarks[0].remarkId
        newProjectId = _id

        done()
    }, 50000)
})

describe('View a Project', () => {
    it('with "admin" user role', async (done) => {
        const resAll = await router
            .get('/webapi/project')

        expect(resAll.statusCode).toEqual(200)
        expect(resAll.body.total).toBeGreaterThan(0)

        const res = await router
            .get(`/webapi/project/${newProjectId}`)
        expect(res.statusCode).toEqual(200)

        const { title, objective, description, status } = res.body.entry

        expect(title).toEqual(data.title)
        expect(objective).toEqual(data.objective)
        expect(description).toEqual(data.description)
        expect(status).toEqual(data.status)

        done()
    }, 50000)
})

describe('Edit a Project', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .patch(`/webapi/project/${newProjectId}`)
            .send({
                remarks: [
                    {
                        message: 'new remark'
                    }
                ]
            })

        expect(res.statusCode).toEqual(200)
        expect(res.body.updatedResult.remarks.length).toEqual(2)

        // delete remark
        const deleteRemarkRes = await router
            .patch(`/webapi/project/${newProjectId}`)
            .send({
                remarks: [
                    {
                        remarkId
                    }
                ],
                remarkAction: 'remove'
            })

        expect(deleteRemarkRes.statusCode).toEqual(200)
        expect(deleteRemarkRes.body.updatedResult.remarks.length).toEqual(1)

        done()
    }, 50000)
})

describe('Delete a Project', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .delete(`/webapi/project/${newProjectId}`)

        expect(res.statusCode).toEqual(200)

        done()
    }, 50000)
})