const express = require('express');
const { register, login, verifyOtp, googleLogin, completeProfile, googleComplete, updateProfile, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validate, registerSchema } = require('../utils/validators');
const router = express.Router();

router.get('/me', protect, getMe);

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, login);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/google', googleLogin);
router.post('/google/complete', googleComplete);
router.put('/complete-profile', protect, completeProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;
