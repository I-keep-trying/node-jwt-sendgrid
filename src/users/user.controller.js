const Joi = require('joi')
const { customAlphabet } = require('nanoid')
require('dotenv').config()
const { v4: uuid } = require('uuid')
const { sendEmail } = require('./helpers/mailer')
const User = require('./user.model')
const { generateJwt } = require('./helpers/generateJwt')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
require('dotenv').config()

const nanoid = customAlphabet(
  '1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  6
)

const userSchema = Joi.object().keys({
  name: Joi.string(),
  email: Joi.string().email({ minDomainSegments: 2 }),
  password: Joi.string().required().min(8),
})

exports.Signup = async (req, res) => {
  try {
    const result = userSchema.validate(req.body)
    console.log('result', result)
    if (result.error) {
      return res.json({
        error: true,
        status: 400,
        message: result.error.message,
      })
    }

    //Check if the email has been already registered.
    const user = await User.findOne({
      email: result.value.email,
    })

    if (user) {
      return res.json({
        error: true,
        message: 'Email is already in use',
      })
    }
    //console.log('user', user) // user === null at this point
    const hash = await User.hashPassword(result.value.password)

    const id = uuid()
    result.value.userId = id

    result.value.password = hash

    //  const code = nanoid()
    //  let expiry = Date.now() + 60 * 1000 * 15 //Set expiry 15 mins ahead from now

    const code = await jwt.sign(result.value.email, process.env.JWT_SECRET)
    console.log('jwt: ', code)
    const activationUrl = `http://localhost:8080/users/activation`

    const sendCode = await sendEmail(
      result.value.name,
      result.value.email,
      activationUrl
    )

    if (sendCode.error) {
      return res.status(500).json({
        error: true,
        message: "Couldn't send verification email.",
      })
    }

    // result.value.emailToken = code
    // result.value.emailTokenExpires = new Date(expiry)

    const newUser = new User(result.value)
    await newUser.save()
    return res
      .cookie('signup_token', code, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'development',
      })
      .status(200)
      .json({
        success: true,
        message: 'Registration Success, check your email.',
      }) //cookie is set at this point
  } catch (error) {
    console.error('signup-error', error)
    return res.status(500).json({
      error: true,
      message: 'Cannot Register',
    })
  }
}

exports.Login = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({
        error: true,
        message: 'Cannot authorize user.',
      })
    }

    //1. Find if any account with that email exists in DB
    const user = await User.findOne({ email: email })

    // NOT FOUND - Throw error
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'Account not found',
      })
    }

    //2. Throw error if account is not activated
    if (!user.active) {
      return res.status(400).json({
        error: true,
        message: 'You must verify your email to activate your account',
      })
    }

    //3. Verify the password is valid
    const isValid = await User.comparePasswords(password, user.password)

    if (!isValid) {
      return res.status(400).json({
        error: true,
        message: 'Invalid credentials',
      })
    }

    const { error, token } = await generateJwt(user.email, user.userId)

    if (error) {
      return res.status(500).json({
        error: true,
        message: "Couldn't create access token. Please try again later",
      })
    }
    /* Instead of saving token in mongodb, use cookies
   // user.accessToken = token

  //  await user.save()
    */

    //Success
    return res
      .cookie('access_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'development',
      })
      .send({
        success: true,
        message: 'User logged in successfully',
        role: user.role,
        id: user.userId,
        name: user.name,
      })
  } catch (error) {
    console.error('Login error', error)
    return res.status(500).json({
      error: true,
      message: "Couldn't login. Please try again later.",
    })
  }
}

exports.Activate = async (req, res) => {
  try {
    const { email, code } = req.body
    if (!email || !code) {
      return res.json({
        error: true,
        status: 400,
        message: 'Please make a valid request',
      })
    }

    const user = await User.findOne({
      email: email,
      emailToken: code,
      emailTokenExpires: { $gt: Date.now() }, // check if the code is expired
    })

    if (!user) {
      return res.status(400).json({
        error: true,
        message: 'Invalid details',
      })
    } else {
      if (user.active)
        return res.send({
          error: true,
          message: 'Account already activated',
          status: 400,
        })

      user.emailToken = ''
      user.emailTokenExpires = null
      user.active = true
      user.role = 'user'
      await user.save()

      return res.status(200).json({
        success: true,
        message: 'Account activated.',
      })
    }
  } catch (error) {
    console.error('activation-error', error)
    return res.status(500).json({
      error: true,
      message: error.message,
    })
  }
}

exports.Activation = async (req, res) => {
  console.log('Activation req.cookies', req.cookies.signup_token)
  // no cookies in req object: cookies: [Object: null prototype] {}
  // WHYYYYYY
  const options = {
    expiresIn: '1h',
  }

  const token = req.cookies.signup_token
  const result = jwt.verify(token, process.env.JWT_SECRET, options)
  console.log('jwt.verify: ', result)

  if (!token || !result) {
    return res.json({
      error: true,
      status: 400,
      message: 'Please make a valid request',
    })
  }

  const user = await User.findOne({
    email: result,
    //   userId: result.id,
  })

  if (!user) {
    return res.status(400).json({
      error: true,
      message: 'Invalid details',
    })
  }

  if (user.active)
    return res.send({
      error: true,
      message: 'Account already activated',
      status: 400,
    })

  user.active = true
  user.role = 'user'
  await user.save()
  console.log('user: ', user)
  /*   return res.send({
    error: true,
    message: 'Who dis',
    status: 400,
  }) */
  return res.json({
    error: false,
    status: 200,
    message: 'Another Different message',
  })
  //status(200).redirect('http://localhost:8080/login')
  /*  try {
    if (!token) {
      return res.json({
        error: true,
        status: 400,
        message: 'Please make a valid request',
      })
    }

    const user = await User.findOne({
      email: result.email,
      userId: result.id,
    })

    if (!user) {
      return res.status(400).json({
        error: true,
        message: 'Invalid details',
      })
    }

    if (user.active)
      return res.send({
        error: true,
        message: 'Account already activated',
        status: 400,
      })

    // user.emailToken = ''
    //  user.emailTokenExpires = null
    user.active = true
    user.role = 'user'
    await user.save()

    return res.status(200).redirect('http://localhost:3000/login')

  } catch (error) {
    console.error('activation-error', error)
    return res.status(500).json({
      error: true,
      message: error.message,
    })
  } */
}

exports.Logout = async (req, res) => {
  const token = req.headers['cookie']
  if (!token) {
    return res.json({ error: true, message: 'Unauthorized to logout' })
  }
  const cookie = token.split('=')[1]

  const decoded = jwt.verify(cookie, process.env.JWT_SECRET)

  const user = await User.findOne({
    email: decoded.email,
  })

  try {
    if (user) {
      return res
        .clearCookie('access_token')
        .send({ success: true, message: 'User Logged out' })
    } else {
      return res.send({ success: false, message: 'Logout error' })
    }
  } catch (error) {
    console.error('user-logout-error', error)
    return res.stat(500).json({
      error: true,
      message: error.message,
    })
  }
}

exports.ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      return res.send({
        status: 400,
        error: true,
        message: 'Cannot be processed',
      })
    }
    const user = await User.findOne({
      email: email,
    })
    if (!user) {
      return res.send({
        success: true,
        message:
          'If that email address is in our database, we will send you an email to reset your password',
      })
    }

    const code = nanoid()
    let response = await sendEmail(user.email, code)

    if (response.error) {
      return res.status(500).json({
        error: true,
        message: "Couldn't send mail. Please try again later.",
      })
    }

    let expiry = Date.now() + 60 * 1000 * 15
    user.resetPasswordToken = code
    user.resetPasswordExpires = expiry // 15 minutes

    await user.save()

    return res.send({
      success: true,
      message:
        'If that email address is in our database, we will send you an email to reset your password',
    })
  } catch (error) {
    console.error('forgot-password-error', error)
    return res.status(500).json({
      error: true,
      message: error.message,
    })
  }
}

exports.ResetPw = async (req, res) => {
  try {
    const result = userSchema.validate(req.body)
    if (result.error) {
      return res.json({
        error: true,
        status: 400,
        message: result.error.message,
      })
    }

    //Check if the email has been already registered.
    var user = await User.findOne({
      email: result.value.email,
    })

    if (!user) {
      return res.json({
        error: true,
        message: 'Cannot reset password. Email not found.',
      })
    }

    const hash = await User.hashPassword(result.value.password)

    const id = uuid()
    result.value.userId = id

    result.value.password = hash

    const code = nanoid()
    let expiry = Date.now() + 60 * 1000 * 15 //Set expiry 15 mins ahead from now

    const sendCode = await sendEmail(result.value.email, code)

    if (sendCode.error) {
      return res.status(500).json({
        error: true,
        message: "Couldn't send verification email.",
      })
    }

    result.value.emailToken = code
    result.value.emailTokenExpires = new Date(expiry)

    const newUser = new User(result.value)
    await newUser.save()

    return res.status(200).json({
      success: true,
      message: 'Password has been reset',
    })
  } catch (error) {
    console.error('signup-error', error)
    return res.status(500).json({
      error: true,
      message: 'Cannot Reset password',
    })
  }
}

exports.UpdateUser = async (req, res) => {
  console.log('Update user: ', req.body)
  const role = req.body
  var user = await User.findOne({
    email: req.body.email,
  })

  if (!user) {
    return res.json({
      error: true,
      message: 'Cannot update user. Email not found.',
    })
  } else {
    user.role = 'admin'
    await user.save()

    return res.status(200).json({
      success: true,
      message: 'User role successfully updated.',
    })
  }
}
