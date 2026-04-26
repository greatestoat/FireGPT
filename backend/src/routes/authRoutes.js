const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, logoutAll } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authLimiter, refreshLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/refresh', refreshLimiter, refresh);

// Protected routes
router.post('/logout', authenticate, logout);
router.post('/logout-all', authenticate, logoutAll);

module.exports = router;