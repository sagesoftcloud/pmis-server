const { connection } = require('mongoose')
const moment = require('moment')

module.exports = {
    viewOverdueNotification: async ({ session, query }) => {
        const { Project, ProjectTask, User } = connection.models 
        const { user } = session
        const currentUser = await User.findById(user)
        const userOverdueNotification = currentUser.overdueNotification

        if (userOverdueNotification !== 'always') {
            const isDate = moment(userOverdueNotification, 'YYYY-MM-DD').isValid
            const dateNow = moment().format('YYYY-MM-DD')

            if(isDate && userOverdueNotification > dateNow) {
                return {
                    projects: [],
                    tasks: []
                } 
            }          
        }

        const overdueProjects = await Project.aggregate([
            {
                $match: {
                    _status: 'active',
                    status: 'Overdue'
                }
            },
            ...await Project.dataView.table(session, query)
        ])

        const overdueProjectTasks = await ProjectTask.aggregate([
            {
                $match: {
                    _status: 'active',
                    status: 'Overdue'
                }
            },
            ...await ProjectTask.dataView.default(session)
        ])

        return {
            projects: overdueProjects,
            tasks: overdueProjectTasks
        }
    },
    setOverdueNotification: async (overdueNotification, user) => {
        const { User } = connection.models 
        const currentUser = await User.findById(user)

        const allowedOverdueNotifications = [
            "always",
            "tomorrow"
        ]

        const _revision = {
            author: {
                userModel: "User",
                doc: user
            },
            description: `Modified overdue notification.`
        }

        if (!allowedOverdueNotifications.includes(overdueNotification)) {
            throw new Error('Invalid overdue notification.')
        }
        
        if (overdueNotification === 'tomorrow') {
            currentUser.overdueNotification = moment().add(1, 'd')
                .format('YYYY-MM-DD')
        }
        else {
            currentUser.overdueNotification = 'always'
        }

        currentUser._revision = _revision

        await currentUser.save()

        return {
            message: "Overdue notification schedule updated successfully."
        }
    }
}