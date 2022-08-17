const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
require('dotenv').config()

const PORT = 8080

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
app.use(express.static('build'))

app.get('/ping', (req, res) => {
  return res.send({
    error: false,
    message: 'Server is healthy',
  })
})

app.use('/users', require('./routes/users'))

app.listen(PORT, () => {
  console.log('Server started listening on PORT : ' + PORT)
})
