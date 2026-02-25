const { RequestError } = require('error-handler')
const ipimBillingInformationService = require('../services/ipimBillingInformation')

module.exports = {
    create: async (req, res, next) => {
        try {
            const { body, session } = req
            const { user = req.user } = session

            const data = await ipimBillingInformationService.create({
                user,
                body
            })

            res.status(200).json(data)
        }

        catch (error) {
            next(new RequestError(400, error.message))
        }
    },
    view: async (req, res, next) => {
        try {
            const data = await ipimBillingInformationService.view({
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