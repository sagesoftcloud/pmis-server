const { authorize } = require('../config/auth')
const financeController = require('../controllers/finance')

const models = require('../models')
const { canSoftDelete } = require('../config')
const crud = require('../controllers/crud')(models, {
    canSoftDelete
}, 'finance')

const years = require('../services/years')

module.exports = (router) => {
    router.route('/finance')
        .get(
            authorize,
            crud.viewAll
        )
    router.route('/finance/:_id')
        .get(
            authorize,
            crud.view
        )
    router.route(`/finance/:_id/obligate`)
        .patch(
            authorize,
            financeController.obligate
        )
    router.route(`/finance/:_id/addDisbursement`)
        .patch(
            authorize,
            financeController.addDisbursement
        )
    router.route(`/finance/:_id/addChecks`)
        .patch(
            authorize,
            financeController.addChecks
        )
    router.route(`/finance/:_id/setToCompleted`)
        .patch(
            authorize,
            financeController.setToCompleted
        )
    router.route(`/finance/:_id/restore`)
        .patch(
            authorize,
            financeController.restore
        )
    router.route(`/finance/years/active`)
        .get(
            authorize,
            years('finance')
        )
}