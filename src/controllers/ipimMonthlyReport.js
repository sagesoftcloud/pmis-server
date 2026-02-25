const { RequestError } = require('error-handler')
const ipimMonthlyReportService = require('../services/ipimMonthlyReport')

module.exports = {
    generate: async (req, res, next) => {
        try {
            const { params, query } = req
            const data = await ipimMonthlyReportService.generate({
                params,
                query: query || {
                }
            })

            res.status(200).json(data)
        }
        catch(error) {
            next(new RequestError(400, error.message))
        }
    },
    view: async (req, res, next) => {
        try {
            const data = await ipimMonthlyReportService.view({
                params: req.params,
                query: req.query,
                session: req.session
            })

            res.status(200).json(data)
        }
        catch(error) {
            next(new RequestError(400, error.message))
        }
    }
}