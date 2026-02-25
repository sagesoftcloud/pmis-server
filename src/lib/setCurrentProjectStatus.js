const projectMonthlyStatusModel = require('../models/projectMonthlyStatus')
const moment = require('moment')
const { getMonthName, getSuspensionTime, getStartAndCompletionDates } = require('./ipimHelpers')

// accepts array of objects which contain, projectDoc, actualExpensesDoc, and lineItemBudgetDoc
module.exports.setCurrentProjectStatus = async (projectInfo) => {
    await Promise.all(projectInfo.map(async (projectInfoItem) => {
        const { projectDoc, billOfQuantityDoc, actualExpensesDoc } = projectInfoItem
        const { _id: projectId } = projectDoc

        const month = moment().month()
        const year = moment().year()
        const reportingMonth = `${getMonthName(month)}-${year}`

        const [ existingReport ] = await projectMonthlyStatusModel.find({
            projectId,
            month,
            year
        })


        let totalExpenses = 0

        if (actualExpensesDoc) {
            totalExpenses = actualExpensesDoc.grandTotal
        }

        const suspensionTime = getSuspensionTime(projectDoc) || null
        const revisedContractAmount = billOfQuantityDoc.isEdited ? billOfQuantityDoc.grandTotal : null
        const expectedStartAndCompletionDates = getStartAndCompletionDates(billOfQuantityDoc, 'budgets')
        const revisedContractDuration = moment(expectedStartAndCompletionDates.completionDate).diff(moment(expectedStartAndCompletionDates.startDate), 'days')
        const revisedTargetCompletionDate = moment(expectedStartAndCompletionDates.completionDate).format('DD-MMM-YYYY')
        const variationOrder = billOfQuantityDoc.grandTotal - totalExpenses
        const extensionBasis = projectDoc.extensionBasis || null
        const numberOfExtensionDays = projectDoc.numberOfExtensionDays || null

        const monthlyStatus = {
            projectId,
            reportingMonth,
            month,
            year,
            revision: billOfQuantityDoc.revision,
            suspensionTime,
            revisedContractAmount,
            revisedContractDuration,
            revisedTargetCompletionDate,
            variationOrder,
            extensionBasis,
            numberOfExtensionDays
        }

        if (existingReport) {
            await projectMonthlyStatusModel.findByIdAndUpdate(existingReport._id, monthlyStatus)
        }

        else {
            await projectMonthlyStatusModel.create(monthlyStatus)
        }

        return existingReport
    }))
}