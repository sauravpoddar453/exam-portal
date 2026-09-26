const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  getMe,
  logoutUser,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { testEmailDebug } = require('../services/emailService');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.get('/test-email', testEmailDebug);
router.get('/logout', logoutUser);
router.get('/me', protect, getMe);

module.exports = router;

