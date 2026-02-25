const { connection } = require('mongoose')

module.exports = {

    /**
     * Gets user document
     * @param {ObjectId} userId Id of the user
     * @returns {Promise<Document>} Finance mongoose document
     */
    getUser: async (userId) => {
        const { User } = connection.models

        const user = await User.findById(userId)

        if (!user || !user.userRole.length) {
            throw new Error('Update finance failed. Invalid user.')
        }

        return user
    }
}