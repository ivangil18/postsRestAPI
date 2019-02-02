const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error('Validation failed!');
    error.statusCode = 422;
    error.data = errors.array();
    throw error;
  }

  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;

  try {
    const hashPw = await bcrypt.hash(password, 12);
    const user = new User({ email: email, password: hashPw, name: name });

    const saveResult = await user.save();
    res.status(201).json({
      message: 'Success, User authenticated',
      userId: saveResult._id
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
      next(err);
    }
  }
};

exports.login = async (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      const error = new Error('A user was not found for that email');
      error.statusCode = 401;
      throw error;
    }

    const isEqual = await bcrypt.compare(password, user.password);

    if (!isEqual) {
      const error = new Error('Wrong Password');
      error.statusCode = 401;
      throw error;
    }
    const token = await  jwt.sign(
      {
        email: user.email,
        userId: user._id.toString()
      },
      'somesupersecretsecret',
      { expiresIn: '1h' }
    );
    res.status(200).json({
      token: token,
      userId: user._id.toString(),
      message: 'Success, User Logged!'
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
      next(err);
    }
  }
};

exports.getStatus = async (req, res, next) => {
  if (!req.userId) {
    const error = new Error('Token misssing');
    error.statusCode = 422;
    throw error;
  }
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({
      status: user.status
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
      next(err);
    }
  }
};

exports.putStatus = async (req, res, next) => {
  if (!req.userId) {
    const error = new Error('Token misssing');
    error.statusCode = 422;
    throw error;
  }

  const newStatus = req.body.status;

  if (!newStatus) {
    const error = new Error('Status misssing');
    error.statusCode = 422;
    throw error;
  }
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    user.status = newStatus;
    const saveResult = await user.save();

    res.status(200).json({
      message: 'Success, Status Updated!',
      status: newStatus
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
      next(err);
    }
  }
};
