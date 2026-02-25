/***
 * File name: generateDefaultConfig.js
 * 
 * Description:
 * generateDefaultConfig.js creates a `User Access Object` which is a summary
 * of the set privileges each user role has access to.
 * 
 * Module Exports:
 * - userAccessObject: an object containing the default configuration for
 * privileges per user role.
 */


module.exports = (privileges) => {
    const userAccessObject = {
        roleType: {
            type: 'String',
            enum: [
                'Internal',
                'External',
                'default'
            ]
        }
    }

    for(const privilege of Object.keys(privileges)) {
        for(const route of privileges[`${privilege}`].route) {
            const method = {
                [route.method]: {
                    available: false,
                    feature: privilege,
                    description: privileges[`${privilege}`].name,
                    module: privileges[`${privilege}`].module,
                    params: route.params,
                    body: route.body,
                    query: route.query
                }
            }

            userAccessObject[route.name] = userAccessObject[route.name] ? {
                "type": "Object",
                default: {
                    ...userAccessObject[route.name].default,
                    ...method
                }
            } : {
                "type": "Object",
                default: {
                    ...method
                }
            }
        }
    }

    return userAccessObject
}