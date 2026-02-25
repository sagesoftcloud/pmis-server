const { authorize } = require('../config/auth')
const history = require('../controllers/history')

module.exports = (router) => {
    router.route(`/history/:_model/:_id`)
        .get(
            authorize,
            history.view
        )
}