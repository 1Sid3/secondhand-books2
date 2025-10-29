const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authGuard = require('../middleware/authGuard');
const { registerValidator, loginValidator } = require('../middleware/validators');

router.post('/register', registerValidator, authController.register);
router.post('/login', loginValidator, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authGuard, authController.getMe);

module.exports = router;
