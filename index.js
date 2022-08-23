const express = require('express')
require('express-async-errors')
const cookieParser = require('cookie-parser')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv').config()

const PORT = process.env.PORT || 8080

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('Database connection Success.')
  })
  .catch((err) => {
    console.error('Mongo Connection Error', err)
  })

const app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use(cookieParser())

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), interest-cohort=()')
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000;includeSubDomains'
  )
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin')
  res.setHeader('Cache-Control', 'max-age=31536000')
  next()
})

app.use(express.static('build'))

app.get('/ping', (req, res) => {
  return res.send({
    error: false,
    message: 'Server is healthy',
  })
})

app.use('/users', require('./routes/users'))

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

//frontend: React-Login-Form
