const { RequestError } = require('error-handler')
const dashboard = require('../services/dashboard')

module.exports = {
    viewDashboard: async (req, res, next) => {
        try {
            const { session, query } = req
            const entries = await dashboard.viewDashboard({
                session,
                query
            })

            res.status(200).json(entries)
        }
        catch(error) {
            next(new RequestError(400, error.message))
        }
    },
    viewOverdue: async(req, res, next) => {
        try {
            const { session, query } = req
            const entries = await dashboard.viewOverdue({
                session,
                query
            })

            res.status(200).json(entries)
        } 

        catch(error) {
            next(new RequestError(400, error.message))
        }
    }
}