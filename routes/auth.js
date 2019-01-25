const express = require('express');

const userController = require('../controllers/auth');


const router = express.Router();

router.put('/signup');

module.exports = router;