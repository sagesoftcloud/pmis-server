/***
 * File name: smoketest.js
 *
 * Description:
 *  Handles API test to know whether the server is up, connected to db, and can send email
 *
 * Functions:
 * - handleCertificate - Generates the custom certificate for the
 *
 * Module Exports:
    - test: Basic test for checking if Backend server is running. Returns default json
    - emailtest: Tests if the server can send an email. Sends to the email added on config
    - usercount: Test if the server can access the database. Returns counts of users exisitng
       database
 *
 */


const ip = require('ip')

const { appData, smokeTest } = require('../config')
const { transporter } = require('../config/auth')
const userModel = require('../models/user')

module.exports = {
    test: (req, res) => {
        res.status(200).json({
            message: 'Hello, world!'
        })
    },
    emailtest: async (req, res) => {
        try {
            await transporter.sendEmailTemplate({
                userObject: null,
                from: appData.email,
                to: smokeTest.email,
                subject: `[${appData.title}] Email Test`,
                filename: `email_test`,
                emailData: {
                    ip: ip.address()
                }
            })
            res.status(200).json({
                message: 'Test email should have been sent.'
            })
        }
        catch (err) {
            res.status(400).json({
                message: err.message
            })
        }
    },
    usercount: async (req, res) => {
        try {
            const userCount = await userModel.find().countDocuments()
            res.status(200).json({
                message: 'This count may include users for internal purposes.',
                userCount
            })
        }
        catch (err) {
            res.status(400).json({
                message: err.message
            })
        }
    },
    getCurrentTime: (req, res) => {
        try {
            res.status(200).json({
                message: 'Current time successfully sent.',
                currentTime: new Date()
            })
        }
        catch (err) {
            res.status(400).json({
                message: err.message
            })
        }
    }
}