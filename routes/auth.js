const express = require('express');
const { body } = require('express-validator/check');

const isAuth = require('../middleware/is-auth');

const User = require('../models/user');

const authController = require('../controllers/auth');

const router = express.Router();

router.put(
  '/signup',
  [
    body('email')
      .isEmail()
      .withMessage('Please, enter a valid email')
      .custom((value, { req }) => {
        return User.findOne({ email: value }).then(userDoc => {
          if (userDoc) {
            return Promise.reject('Email address already exists!');
          }
        });
      })
      .normalizeEmail(),
    body('password')
      .trim()
      .isLength({ min: 5 }),
    body('name')
      .trim()
      .not()
      .isEmpty()
  ],
  authController.signup
);

router.post('/login', authController.login);

router.get('/status', isAuth, authController.getStatus);

router.put(
  '/updateStatus',
  [
    body('status')
      .trim()
      .not()
      .isEmpty()
  ],
  isAuth,
  authController.putStatus
);

module.exports = router;
