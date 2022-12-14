require('dotenv').config()
const nodemailer = require('nodemailer')

async function sendEmail(name, email, link) {
  try {
    // The body of the email for recipients
    const body_html = `Thank you ${name}, please verify your email: ${link}`

    const smtpEndpoint = 'smtp.sendgrid.net'
    const port = 465
    const senderAddress = `ANDREA <dre.crego@gmail.com>`
    const toAddress = email
    const smtpUsername = 'apikey'
    const smtpPassword = process.env.SG_APIKEY
    const subject = 'Verify your email'

    // Create the SMTP transport.
    let transporter = nodemailer.createTransport({
      host: smtpEndpoint,
      port: port,
      secure: true, // true for 465, false for other ports
      auth: {
        user: smtpUsername,
        pass: smtpPassword,
      },
    })

    // Specify the fields in the email.
    const mailOptions = {
      from: senderAddress,
      to: toAddress,
      subject: subject,
      text: `Thank you ${name}, please verify your email: ${link}`,
      html: body_html,
    }

    const info = await transporter.sendMail(mailOptions)

    return { error: false }
  } catch (error) {
    console.error('send-email-error', error)
    return {
      error: true,
      message: 'Cannot send email',
    }
  }
}

module.exports = { sendEmail }
