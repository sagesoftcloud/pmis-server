/***
 * File name: user.test.js
 *
 * Program Description:
 * This file includes tests for user creation testing process.
 */


const request = require('supertest')
const app = require('../../app')
const router = request.agent(app)

const userData = require('../data/user')
const departmentData = require('../data/department')
const { admin } = require('../data/loginCreds')

let departmentDataId = ''

let newTestUserId = ''
let newTestUserRole = ''

beforeAll(async (done) => {
    await router
        .get('/webapi/user/account/logout')
    await router
        .post('/webapi/user/account/login?forceful=true')
        .send({
            ...admin,
            testing: true
        })
    const createdDepartment = await router
        .post('/webapi/department')
        .send(departmentData)

    const { entry } = createdDepartment.body
    departmentDataId = entry._id

    done()
})

afterAll(async (done) => {
    await router
        .delete(`/webapi/department/${departmentDataId}`)
    const session = await router
        .post('/webapi/user/account/session')
    if(session.body.message === 'User session has been updated.') {
        await router
            .get('/webapi/user/account/logout')
    }
    done()
})

describe('Create internal user', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .post('/webapi/admin/users')
            .send({
                info: {
                    ...userData.info,
                    department: departmentDataId
                }
            })
        expect(res.statusCode).toEqual(201)
        expect(res.body.message).toEqual('User has been created.')
        const { _id, userRole } = res.body.userData

        newTestUserId = _id
        newTestUserRole = userRole

        done()
    }, 50000)
})

describe('View a User', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .get(`/webapi/admin/user/${newTestUserRole}/${newTestUserId}`)
        expect(res.statusCode).toEqual(200)
        const { entry } = res.body

        // check if userData info is equal to entry
        expect(entry.userRole).toEqual(userData.info.userRole)
        expect(entry.userType).toEqual(userData.info.userType)
        expect(entry.employeeType).toEqual(userData.info.employeeType)
        expect(entry.role).toEqual(userData.info.role)
        expect(entry.firstName).toEqual(userData.info.firstName)
        expect(entry.middleName).toEqual(userData.info.middleName)
        expect(entry.lastName).toEqual(userData.info.lastName)
        expect(entry.position).toEqual(userData.info.position)
        expect(entry.employeeId).toEqual(userData.info.employeeId.toString())
        expect(entry.department._id.toString()).toEqual(departmentDataId.toString())
        expect(entry.immediateSupervisor).toEqual(userData.info.immediateSupervisor)
        expect(entry.email).toEqual(userData.info.email)
        expect(entry.mobileNumber).toEqual(userData.info.mobileNumber)

        done()
    }, 50000)
})

describe('View All Users', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .get('/webapi/admin/users')
        expect(res.statusCode).toEqual(200)
        expect(res.body.total).toBeGreaterThan(0)

        done()
    }, 50000)
})

describe('Update internal user details', () => {
    it('with "admin" user role', async (done) => {
        const res = await router
            .patch(`/webapi/admin/user/${newTestUserRole}/${newTestUserId}`)
            .send({
                info: {
                    firstName: 'Updated',
                    middleName: 'Updated',
                    lastName: 'Updated'
                }
            })

        expect(res.statusCode).toEqual(200)
        expect(res.body.message).toEqual('User has been updated.')

        expect(res.body.userData.firstName).toEqual('Updated')
        expect(res.body.userData.middleName).toEqual('Updated')
        expect(res.body.userData.lastName).toEqual('Updated')

        done()
    }, 50000)
})

describe('Delete internal user', () => {
    it('Delete a user from the system', async (done) => {
        const users = await router
            .get('/webapi/admin/users')

        const preDeleteTotalUsers = users.body.total

        const res = await router
            .delete(`/webapi/admin/user/${newTestUserRole}/${newTestUserId}`)

        expect(res.statusCode).toEqual(200)
        expect(res.body.message).toEqual('User has been deleted.')

        const ver = await router
            .get(`/webapi/admin/user/${newTestUserRole}/${newTestUserId}`)
        expect(ver.body.error).toEqual('User is not found.')

        const ver2 = await router
            .get('/webapi/admin/users')

        expect(ver2.body.total).toEqual(preDeleteTotalUsers - 1)
        done()
    }, 50000)
})