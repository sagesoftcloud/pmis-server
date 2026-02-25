const models = require('../models')

module.exports = class Report {
    constructor (reports) {
        this.reports = reports
        // this.connection = dbConn
        // this.schemaName = reportName
        // this.schema = reportSchema
    }

    // initReport() {
    //     this.Model = this.db.model(this.schemaName, this.schema)
    // }

    // async initCharts() {
    //     //Generates charts to be used in `GenerateReport` function
    //     const count = await this.Model.countDocuments({
    //     })
    //     if(!count) {
    //         await this.Model.create(this.reports)
    //     }
    // }

    async generateReport({ data, chartName, chartType }) {
        const { options } = data
        const { aggPipeline, modelName } = this.reports[`${chartName}`][`${chartType}`](data, options)
        const reportData = await models[`${modelName}`].aggregate(aggPipeline)
        return reportData
    }
}