/* eslint-disable no-undefined */
const { connection } = require('mongoose')
const { FOR_ACCOUNTING, FOR_BUDGET, FOR_CASHIER, COMPLETED } = require('../config/meta')

module.exports = {

    /**
     * Gets finance mongoose document
     * @param {ObjectId} financeId Id of the finance
     * @returns {Promise<Document>} Finance mongoose document
     */
    getFinance: async (financeId) => {
        const { Finance } = connection.models

        const finance = await Finance.findById(financeId)

        if (!finance) {
            throw new Error('Finance update failed. Finance not found.')
        }

        return finance
    },

    /**
     * update finance obligate
     * @param {Document} finance finance mongoose document
     * @param {object} obligatedItem obligated item
     * @param {object} obligatedAmount obligated amount
     * @returns {Promise<Document>} finance mongoose document
     */
    obligate: async (finance, obligatedItem, obligatedAmount) => {
        if (finance.status === FOR_BUDGET) {
            finance.status = FOR_ACCOUNTING
        }

        finance.remainingBudget = (finance.approvedProposedBudget ? finance.approvedProposedBudget : 0) - (obligatedAmount ? obligatedAmount : 0)

        finance.obligatedItem = obligatedItem
        finance.obligatedAmount = obligatedAmount

        await finance.save()

        return finance
    },

    /**
     * update finance disbursement
     * @param {Document} finance finance mongoose document
     * @param {object} obligatedItem obligated item
     * @returns {Promise<Document>} finance mongoose document
     */
    addDisbursement: async (finance, obligatedItem) => {
        if (finance.status === FOR_BUDGET) {
            throw new Error(`Failed to add disbursement. Status must be ${FOR_ACCOUNTING}`)
        }

        if (finance.status === FOR_ACCOUNTING) {
            finance.status = FOR_CASHIER
        }

        finance.obligatedItem = obligatedItem

        await finance.save()

        return finance
    },

    /**
     * update finance checks
     * @param {Document} finance finance mongoose document
     * @param {object} obligatedItem obligated item
     * @returns {Promise<Document>} finance mongoose document
     */
    addChecks: async (finance, obligatedItem) => {
        const invalidStatuses = [
            FOR_BUDGET,
            FOR_ACCOUNTING
        ]

        if (invalidStatuses.includes(finance.status)) {
            throw new Error(`Add check failed. Status must be ${FOR_CASHIER}`)
        }

        finance.obligatedItem = obligatedItem

        await finance.save()

        return finance
    },

    /**
     * set to completed finance
     * @param {Document} finance finance mongoose document
     * @returns {Promise<Document>} finance mongoose document
     */
    setToCompleted: async (finance) => {
        const invalidStatuses = [
            FOR_BUDGET,
            FOR_ACCOUNTING
        ]

        if (invalidStatuses.includes(finance.status)) {
            throw new Error(`Set to completed failed. Status must be ${FOR_CASHIER}`)
        }

        finance.status = COMPLETED

        await finance.save()

        return finance
    },

    /**
     * set to completed finance
     * @param {Document} finance finance mongoose document
     * @returns {Promise<Document>} finance mongoose document
     */
    restore: async (finance) => {
        if (finance._status !== 'deleted') {
            throw new Error(`Restore finance failed. It is not archived.`)
        }

        finance._status = 'active'
        finance.restoredAt = new Date()

        await finance.save()

        return finance
    }
}