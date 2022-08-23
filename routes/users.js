const express = require('express')
const router = express.Router()
const cleanBody = require('../middleware/cleanbody')
const AuthController = require('../src/users/user.controller')
const { validateToken } = require('../middleware/validateToken')
const { authorization } = require('../src/users/helpers/auth')

//Define endpoints
router.post('/signup', cleanBody, AuthController.Signup)
router.post('/login', cleanBody, AuthController.Login)
router.patch('/activate', cleanBody, AuthController.Activate)
router.get('/logout', AuthController.Logout)
router.patch('/forgot', cleanBody, AuthController.ForgotPassword)

module.exports = router
