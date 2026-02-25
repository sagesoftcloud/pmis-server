const { RequestError } = require('error-handler')
const history = require('../services/history')

module.exports = {
    view: async (req, res, next) => {
        try {
            const data = await history.view({
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