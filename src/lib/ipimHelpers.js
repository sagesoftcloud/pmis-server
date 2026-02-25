const moment = require('moment')
const { sortArray } = require('./utils')
const projectMonthlyStatusModel = require('../models/projectMonthlyStatus')
const { timezone } = require('../config/meta')

const validateProject = (project) => {
    const { lineItemBudget } = project

    if (!lineItemBudget) {
        return 1
    }

    return 0
}

const getMonthName = (monthNumber) => {
    const date = new Date();
    date.setMonth(monthNumber);

    return date.toLocaleString('en-US', {
        month: 'short'
    });
}

const createReport = ({ startDate, completionDate, total, grandTotal, totalDaysDuration }) => {
    const weightEquivalent = total / grandTotal * 100

    const startDateMoment = moment(startDate)
    const completionDateMoment = moment(completionDate)

    const monthName = getMonthName(startDateMoment.month())
    const reportingMonth = `${monthName}-${startDateMoment.year()}`

    let daysUsedThisMonth = startDateMoment.daysInMonth()
    let duration = totalDaysDuration

    const isSameMonth = startDateMoment.month() === completionDateMoment.month()

    if(isSameMonth) {
        daysUsedThisMonth = completionDateMoment.diff(startDateMoment, 'days')
    }

    else if(!isSameMonth && startDateMoment.date() !== 1) {
        daysUsedThisMonth = moment(startDateMoment).daysInMonth() - startDateMoment.date() + 1
    }

    if (totalDaysDuration === 0) {
        duration = 1
    }

    if (daysUsedThisMonth === 0) {
        daysUsedThisMonth = 1
    }

    return {
        reportingMonth,
        cumulative: weightEquivalent * daysUsedThisMonth / duration,
        yearMonth: `${startDateMoment.format('YYYY-MM')}`
    }
}

const getReportsPercentage = (arr, grandTotal, fieldName = 'expected') => {
    const reports = []

    arr.forEach((budget) => {
        budget.items = budget.items.filter((item) => item[`${fieldName}StartDate`] && item[`${fieldName}CompletionDate`])

        if (budget.items.length) {
            budget.items.forEach((item) => {
                const totalMonthsDuration = moment(item[`${fieldName}CompletionDate`]).startOf('month')
                    .diff(moment(item[`${fieldName}StartDate`]).startOf('month'), 'months') + 1

                const totalDaysDuration = moment(item[`${fieldName}CompletionDate`]).diff(moment(item[`${fieldName}StartDate`]), 'days')

                let startDate = item[`${fieldName}StartDate`]
                const completionDate = item[`${fieldName}CompletionDate`]

                for(let i = 0; i < totalMonthsDuration; i++) {
                    if (moment(startDate).format('YYYY-MM-DD') !== moment(completionDate).format('YYYY-MM-DD') || i === 0) {
                        reports.push(createReport({
                            startDate,
                            completionDate,
                            total: item.total,
                            grandTotal,
                            totalDaysDuration
                        }))

                        startDate = moment(startDate)
                            .startOf('month')
                            .add(1, 'months')
                    }
                }
            })
        }
    })

    return reports
}

const combineSameMonth = (reports) => {
    const sortedReports = sortArray(reports, 'yearMonth', 1)
    const reducedReports = Array.from(sortedReports.reduce((m, { reportingMonth, cumulative }) => m.set(reportingMonth, (m.get(reportingMonth) || 0) + cumulative), new Map()), ([
        reportingMonth,
        cumulative
    ]) => ({
        reportingMonth,
        cumulative
    }));

    return reducedReports
}

const cumulateReports = (reports, fieldName) => reports.map((report, index) => {
    if (index === 0) {
        return {
            reportingMonth: report.reportingMonth,
            [`${fieldName}`]: Number(report.cumulative.toFixed(2))
        }
    }

    let total = 0
    for(let i = 0; i <= index; i++) {
        total += Number(reports[`${i}`].cumulative)
    }

    const newReport = {
        reportingMonth: report.reportingMonth,
        [`${fieldName}`]: Number(total.toFixed(2))
    }

    return newReport

})

const convertReportingMonthToDate = (reportingMonth, withDate = false) => {
    const splitReportingMonth = reportingMonth.split('-')

    const date = new Date(`${splitReportingMonth[0]} 1, ${splitReportingMonth[1]}`)

    if (withDate) {
        return moment(date).format('YYYY-MM-DD')
    }

    return moment(date).format('YYYY-MM')
}

const fillMissingReports = (reports) => {
    const reportsWithFirstDays = reports.map((report) => ({
        ...report,
        firstDayOfTheMonth: convertReportingMonthToDate(report.reportingMonth, true)
    }))

    const missingMonths = []

    reportsWithFirstDays.forEach((report, index) => {
        if (reportsWithFirstDays.length > index + 1) {
            const nextMonthFirstDay = moment(report.firstDayOfTheMonth)
                .add(1, 'month')
                .format('YYYY-MM-DD')

            const nextIndexFirstDay = reportsWithFirstDays[index + 1].firstDayOfTheMonth
            if (nextMonthFirstDay !== reportsWithFirstDays[index + 1]) {
                missingMonths.push({
                    start: nextMonthFirstDay,
                    end: moment(nextIndexFirstDay)
                        .subtract(1, 'month')
                        .format('YYYY-MM-DD')
                })
            }
        }
    })

    missingMonths.forEach((month) => {
        const numberOfMonths = moment(month.end).diff(moment(month.start), 'months') + 1

        let { start } = month

        for (let i = 0; i < numberOfMonths; i++) {
            reportsWithFirstDays.push({
                reportingMonth: moment(start).format('MMM-YYYY'),
                firstDayOfTheMonth: start,
                cumulative: 0
            })

            start = moment(start)
                .add(1, 'month')
                .format('YYYY-MM-DD')
        }
    })

    const sortedReports = sortArray(reportsWithFirstDays, 'firstDayOfTheMonth')

    return sortedReports
}

const handleCumulativePlanned = (budgetDoc) => {
    if (!budgetDoc || !budgetDoc.isBOQ) {
        return []
    }

    const { budgets, grandTotal } = budgetDoc

    const reports = getReportsPercentage(budgets, grandTotal, 'expected')

    const combinedReports = combineSameMonth(reports)

    const filledReports = fillMissingReports(combinedReports)

    const cumulatedReports = cumulateReports(filledReports, 'cumulativePlanned')

    return cumulatedReports
}

const handleCumulativeActual = (actualExpensesDoc, grandTotal) => {
    if (!actualExpensesDoc) {
        return []
    }

    const { expenses } = actualExpensesDoc

    const reports = getReportsPercentage(expenses, grandTotal, 'actual')

    const combinedReports = combineSameMonth(reports)

    const filledReports = fillMissingReports(combinedReports)

    const cumulatedReports = cumulateReports(filledReports, 'cumulativeActual')

    return cumulatedReports
}

const getStartAndCompletionDates = (document, documentType = 'budgets') => {
    let startDate = null
    let completionDate = null

    if (!document) {
        return null
    }

    const arr = document[`${documentType}`]
    let fieldHelper = 'expected'

    if (documentType === 'expenses') {
        fieldHelper = 'actual'
    }

    arr.forEach((budget, index) => {
        budget.items = budget.items.filter((item) => item[`${fieldHelper}StartDate`] && item[`${fieldHelper}CompletionDate`])

        if (budget.items.length) {
            if (index === 0) {
                startDate = budget.items[0][`${fieldHelper}StartDate`]
                completionDate = budget.items[0][`${fieldHelper}CompletionDate`]
            }

            else {
                budget.items.forEach((item) => {
                    if (item[`${fieldHelper}StartDate`] < startDate) {
                        startDate = item[`${fieldHelper}StartDate`]
                    }

                    if (item[`${fieldHelper}CompletionDate`] > completionDate) {
                        completionDate = item[`${fieldHelper}CompletionDate`]
                    }
                })
            }
        }
    })

    return {
        startDate,
        completionDate
    }
}

const getSuspensionTime = (project) => {
    const { daysSuspended = 0, suspensionDate } = project

    let totalSuspensionDays = daysSuspended

    if (suspensionDate) {
        totalSuspensionDays += moment().diff(moment(suspensionDate), 'days')
    }

    return totalSuspensionDays
}

// eslint-disable-next-line max-params
const getCumulatedReports = async (projectDoc, budgetDoc, actualExpensesDoc, cumulativeOnly = false) => {
    if (!projectDoc) {
        throw new Error('Project not found.')
    }

    const resultCode = validateProject(projectDoc)

    if (resultCode === 1) {
        return []
    }

    const cumulativePlanned = handleCumulativePlanned(budgetDoc)
    const cumulativeActual = handleCumulativeActual(actualExpensesDoc, budgetDoc.grandTotal)

    if (!cumulativePlanned.length) {
        const currentMonthName = getMonthName(moment().month())
        const currentYear = moment().year()
        const currentReportingMonth = `${currentMonthName}-${currentYear}`

        return [
            {
                reportMonth: currentReportingMonth,
                cumulativeActual: 0,
                cumulativePlanned: 0
            }
        ]
    }

    const combinedReports = cumulativePlanned.map((planned) => {

        const sameReportingMonthActual = cumulativeActual.find((actual) => actual.reportingMonth === planned.reportingMonth)


        const combined = {
            ...planned,
            cumulativeActual: sameReportingMonthActual ? sameReportingMonthActual.cumulativeActual : 0
        }

        return {
            ...combined,
            variance: combined.cumulativeActual - combined.cumulativePlanned
        }
    })

    const monthlyStatuses = await projectMonthlyStatusModel.aggregate([
        {
            $match: {
                projectId: projectDoc._id
            }
        },
        {
            $addFields: {
                revisedTargetCompletionDate: {
                    $dateToString: {
                        date: '$revisedTargetCompletionDate',
                        timezone,
                        format: '%Y-%m-%d',
                        onNull: '$$REMOVE'
                    }
                }
            }
        },
        {
            $project: {
                dateCreated: 0,
                dateUpdated: 0,
                status: 0,
                __v: 0
            }
        }
    ])

    const reportsWithMonthlyStatus = combinedReports.map((combinedReport) => {

        const sameReportingMonth = monthlyStatuses.find((statusReport) => combinedReport.reportingMonth === statusReport.reportingMonth)

        const reportDate = convertReportingMonthToDate(combinedReport.reportingMonth, true)

        let fullReport = {
            ...combinedReport,
            projectId: projectDoc._id,
            month: moment(reportDate).month(),
            year: moment(reportDate).year(),
            revision: null,
            suspensionTime: null,
            revisedContractAmount: null,
            revisedContractDuration: null,
            revisedTargetCompletionDate: null,
            variationOrder: null,
            extensionBasis: null,
            numberOfExtensionDays: null
        }

        if (sameReportingMonth) {
            fullReport = {
                ...combinedReport,
                ...sameReportingMonth
            }
        }

        return fullReport
    })

    if (cumulativeOnly) {
        return reportsWithMonthlyStatus.map((report) => ({
            reportingMonth: report.reportingMonth,
            cumulativePlanned: report.cumulativePlanned,
            cumulativeActual: report.cumulativeActual,
            revisedContractAmount: report.revisedContractAmount,
            variance: report.variance,
            projectId: report.projectId
        }))
    }

    return reportsWithMonthlyStatus
}

const getLatestReport = (projectDoc, budgetDoc, actualExpensesDoc) => {
    let totalExpenses = 0

    if (actualExpensesDoc) {
        totalExpenses = actualExpensesDoc.grandTotal
    }

    if (!projectDoc) {
        throw new Error('Project not found.')
    }

    const resultCode = validateProject(projectDoc)

    const suspensionTime = getSuspensionTime(projectDoc) || null
    const revisedContractAmount = budgetDoc.isEdited ? budgetDoc.grandTotal : null
    const expectedStartAndCompletionDates = getStartAndCompletionDates(budgetDoc, 'budgets')
    const actualStartAndCompletionDates = getStartAndCompletionDates(actualExpensesDoc, 'expenses')

    const revisedContractDuration = moment(expectedStartAndCompletionDates.completionDate).diff(moment(expectedStartAndCompletionDates.startDate), 'days')
    const revisedTargetCompletionDate = moment(expectedStartAndCompletionDates.completionDate).format('DD-MMM-YYYY')
    const variationOrder = budgetDoc.grandTotal - totalExpenses
    const extensionBasis = projectDoc.extensionBasis || null
    const numberOfExtensionDays = projectDoc.numberOfExtensionDays || null

    const latestReportDetails = {
        revision: budgetDoc.revision,
        revisedContractAmount,
        revisedContractDuration,
        revisedTargetCompletionDate,
        variationOrder,
        extensionBasis,
        numberOfExtensionDays,
        suspensionTime,
        projectId: projectDoc._id,
        month: moment().month(),
        year: moment().year()
    }

    if (resultCode === 1) {
        return []
    }

    let cumulativePlanned = handleCumulativePlanned(budgetDoc)
    let cumulativeActual = handleCumulativeActual(actualExpensesDoc, budgetDoc.grandTotal)

    const currentReportingMonth = `${getMonthName(moment().month())}-${moment().year()}`

    if (!expectedStartAndCompletionDates || !cumulativePlanned.length) {
        cumulativePlanned = [
            {
                reportingMonth: currentReportingMonth,
                cumulativePlanned: 0
            }
        ]
    }

    if (!actualStartAndCompletionDates || !cumulativeActual.length) {
        cumulativeActual = [
            {
                reportingMonth: currentReportingMonth,
                cumulativeActual: 0
            }
        ]
    }


    let latestCumulativePlanned = cumulativePlanned.find((report) => report.reportingMonth === currentReportingMonth)
    let latestCumulativeActual = cumulativeActual.find((report) => report.reportingMonth === currentReportingMonth)

    const currentYearMonth = moment().format('YYYY-MM')

    if (!latestCumulativePlanned) {
        const [ firstCumulativePlanned ] = cumulativePlanned
        const lastCumulativePlanned = cumulativePlanned[cumulativePlanned.length - 1]
        const firstYearMonth = convertReportingMonthToDate(firstCumulativePlanned.reportingMonth)
        const lastYearMonth = convertReportingMonthToDate(lastCumulativePlanned.reportingMonth)

        if (firstYearMonth > currentYearMonth) {
            latestCumulativePlanned = {
                reportingMonth: `${getMonthName(moment().month())}-${moment().year()}`,
                cumulativePlanned: 0
            }
        }

        else if (lastYearMonth < currentYearMonth) {
            latestCumulativePlanned = {
                reportingMonth: `${getMonthName(moment().month())}-${moment().year()}`,
                cumulativePlanned: lastCumulativePlanned.cumulativePlanned
            }
        }
    }

    if (!latestCumulativeActual) {
        const [ firstCumulativeActual ] = cumulativeActual
        const lastCumulativeActual = cumulativeActual[cumulativeActual.length - 1]
        const firstYearMonth = convertReportingMonthToDate(firstCumulativeActual.reportingMonth)
        const lastYearMonth = convertReportingMonthToDate(lastCumulativeActual.reportingMonth)

        if (firstYearMonth > currentYearMonth) {
            latestCumulativeActual = {
                reportingMonth: `${getMonthName(moment().month())}-${moment().year()}`,
                cumulativeActual: 0
            }
        }

        else if (lastYearMonth < currentYearMonth) {
            latestCumulativeActual = {
                reportingMonth: `${getMonthName(moment().month())}-${moment().year()}`,
                cumulativeActual: lastCumulativeActual.cumulativeActual
            }
        }
    }

    latestReportDetails.variance = (latestCumulativeActual.cumulativeActual - latestCumulativePlanned.cumulativePlanned).toFixed(2)

    return {
        ...latestReportDetails,
        ...latestCumulativePlanned,
        ...latestCumulativeActual
    }
}

module.exports.getLatestReport = getLatestReport
module.exports.getCumulatedReports = getCumulatedReports
module.exports.getSuspensionTime = getSuspensionTime
module.exports.getStartAndCompletionDates = getStartAndCompletionDates
module.exports.getMonthName = getMonthName