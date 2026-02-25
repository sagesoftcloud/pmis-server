const { RequestError } = require('error-handler')
const notification = require('../services/notification')

module.exports = {
    viewOverdueNotification: async (req, res, next) => {
        try {
            const { session, query } = req
            const data = await notification.viewOverdueNotification({
                session,
                query 
            })

            res.status(200).json(data)
        }
        catch(error) {
            next(new RequestError(400, error.message))
        }
    },
    setOverdueNotification: async (req, res, next) => {
        try {
            const { user } = req.session
            const { overdueNotification } = req.body
            const data = await notification.setOverdueNotification(overdueNotification, user)

            res.status(200).json(data)
        }
        catch(error) {
            next(new RequestError(400, error.message))
        }
    }
}