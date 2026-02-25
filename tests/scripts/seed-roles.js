/* eslint-disable prefer-destructuring */
/* eslint-disable no-negated-condition */
/* eslint-disable no-console */
const { Authorization } = require('../../src/config/auth')
const roles = require('../../src/config/roles')

const createAuthorization = async ({ privileges, label, roleType, role, createdBy }) => {
    const defaultAccess = await Authorization
        .buildRouteAccess(privileges, role)

    await Authorization.create({
        _configType: role,
        label,
        ...defaultAccess,
        createdBy,
        roleType,
        _revision: {
            author: {
                doc: null,
                userModel: null
            },
            description: `Created user role named ${role} by seeding.`
        }
    })

    await Authorization
        .updateRoleAccess(role, 'create', {
            doc: null,
            userModel: null
        })

}

const seed = async () => {
    const defaultUserRoles = Object.keys(roles)
    const createdAuths = await Authorization.find({
        _configType: {
            $nin: [
                ...defaultUserRoles,
                'default'
            ]
        }
    })

    const createdUserRoles = []

    await Promise.all(createdAuths.map(async (item) => {
        const { label, roleType, _configType, createdBy } = item

        const userRole = {
        }
        userRole.label = label
        userRole._configType = _configType
        userRole.roleType = roleType
        userRole.privileges = []
        userRole.createdBy = createdBy ? createdBy : null

        const privilegeSet = await item.getPrivilegeSet()

        for (const privilege of privilegeSet) {
            if(privilege.available) {
                userRole.privileges.push(privilege.value)
            }
        }

        createdUserRoles.push(userRole)
    }))


    await Authorization.deleteMany({
    })

    await Authorization.create({
        _configType: 'default',
        roleType: 'default',
        _revision: {
            author: {
                doc: null,
                userModel: null
            },
            description: `Created user role named default by seeding.`
        }
    })

    // seeder for default user roles
    const rolesArr = Object.keys(roles).map(async (role) => {
        let privileges = roles[`${role}`]
        let label = role
        if(!Array.isArray(roles[`${role}`])) {
            label = roles[`${role}`].label
            privileges = roles[`${role}`].privileges
        }

        await createAuthorization({
            privileges,
            label,
            roleType: roles[`${role}`].roleType,
            role
        })

        return Promise.resolve()
    })
    await Promise.all(rolesArr)

    // seeder for added user roles
    const createdRolesArr = createdUserRoles.map(async (item) => {
        const { label, privileges, _configType, createdBy } = item
        const role = _configType

        await createAuthorization({
            privileges,
            label,
            createdBy,
            roleType: roles.roleType,
            role
        })

        return Promise.resolve()
    })
    await Promise.all(createdRolesArr)

    console.log('Seeding user roles done.')
    // eslint-disable-next-line no-process-exit
    process.exit(0)
}

seed()