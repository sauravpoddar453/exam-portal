const crypto = require('crypto');
const User = require('../models/User');
const AuthLog = require('../models/AuthLog');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDBStatus } = require('../config/db');
const { MOCK_USERS_BY_TOKEN } = require('../middleware/authMiddleware');
const {
  sendOtpVerificationEmail,
  sendForgotPasswordOtpEmail,
  sendPasswordResetSuccessEmail,
} = require('../services/emailService');

const logAuthAttempt = async (req, email, success, reason, user = null) => {
  try {
    if (getDBStatus() === 'Connected') {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
      await AuthLog.create({
        user: user ? user._id : undefined,
        email: email ? email.toLowerCase().trim() : 'unknown',
        success,
        reason,
        ipAddress: clientIp.toString(),
        role: user ? user.role : 'student',
      });
    }
  } catch (err) {
    console.error('[AuthLog] Error logging auth attempt:', err.message);
  }
};

// In-memory mock database for fallback testing when MongoDB is disconnected
const MOCK_USER_DATABASE = [
  {
    _id: '650000000000000000000001',
    name: 'Admin User',
    email: 'admin@examportal.com',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    isVerified: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: '650000000000000000000002',
    name: 'Sarah Teacher',
    email: 'teacher@examportal.com',
    passwordHash: bcrypt.hashSync('teacher123', 10),
    role: 'teacher',
    isVerified: true,
    createdAt: new Date().toISOString(),
  },
  {
    _id: '650000000000000000000003',
    name: 'John Student',
    email: 'student@examportal.com',
    passwordHash: bcrypt.hashSync('student123', 10),
    role: 'student',
    isVerified: true,
    createdAt: new Date().toISOString(),
  },
];

// Helper to generate JWT token
const sendTokenResponse = (user, statusCode, res, noticeMessage = null) => {
  const secret = process.env.JWT_SECRET || 'exam_portal_jwt_secret_key_2026_super_secure';
  const expiresIn = process.env.JWT_EXPIRE || '30d';

  const token = jwt.sign(
    { id: user._id, role: user.role, name: user.name, email: user.email },
    secret,
    { expiresIn }
  );

  // Store mock user token mapping for disconnected fallback
  MOCK_USERS_BY_TOKEN.set(token, user);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      teacherApprovalStatus: user.teacherApprovalStatus || (user.role === 'teacher' ? 'pending' : 'approved'),
      isBlocked: !!user.isBlocked,
      createdAt: user.createdAt,
    },
    notice: noticeMessage,
  });
};

/**
 * @desc    Register a new user (generates 6-digit OTP and requires email verification)
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Reject admin self-registration immediately with 403 Forbidden
    if (role && role.toString().trim().toLowerCase() === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be created through public registration',
      });
    }

    const validRoles = ['student', 'teacher'];
    const requestedRole = role ? role.toString().trim().toLowerCase() : 'student';
    if (!validRoles.includes(requestedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Self-registration is only permitted for Student or Teacher accounts.',
      });
    }
    const userRole = requestedRole;
    const cleanEmail = email.toLowerCase().trim();

    // Generate 6-digit OTP code and expiry (10 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    const lastOtpSentAt = new Date();

    if (getDBStatus() === 'Connected') {
      const userExists = await User.findOne({ email: cleanEmail }).select('+password +otp');
      if (userExists) {
        if (userExists.isVerified) {
          return res.status(400).json({
            success: false,
            message: 'Email already registered, please login.',
          });
        }

        // Account exists but is NOT verified -> regenerate OTP, update user, and resend
        userExists.name = name || userExists.name;
        userExists.password = password; // Mongoose pre-save hook hashes updated password
        userExists.role = userRole;
        userExists.otp = otp;
        userExists.otpExpiry = otpExpiry;
        userExists.lastOtpSentAt = lastOtpSentAt;
        await userExists.save();

        console.log(`Attempting to send OTP to: ${cleanEmail}`);
        const sendResult = await sendOtpVerificationEmail({
          toEmail: cleanEmail,
          userName: userExists.name,
          otpCode: otp,
        });
        console.log('OTP send result:', sendResult);

        return res.status(200).json({
          success: true,
          requiresVerification: true,
          email: cleanEmail,
          message: "Account already exists but is not verified. We've sent you a new verification code.",
        });
      }

      await User.create({
        name,
        email: cleanEmail,
        password,
        role: userRole,
        teacherApprovalStatus: userRole === 'teacher' ? 'pending' : 'approved',
        isVerified: false,
        otp,
        otpExpiry,
        lastOtpSentAt,
      });

      // Send OTP verification email
      console.log(`Attempting to send OTP to: ${cleanEmail}`);
      const sendResult = await sendOtpVerificationEmail({
        toEmail: cleanEmail,
        userName: name,
        otpCode: otp,
      });
      console.log('OTP send result:', sendResult);

      return res.status(201).json({
        success: true,
        requiresVerification: true,
        email: cleanEmail,
        message: 'Registration successful! An OTP verification code has been sent to your email address.',
      });
    }

    // Mock fallback when DB disconnected
    const existingMock = MOCK_USER_DATABASE.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingMock) {
      if (existingMock.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered, please login.',
        });
      }

      // Account exists but is NOT verified in mock DB
      existingMock.name = name || existingMock.name;
      existingMock.passwordHash = bcrypt.hashSync(password, 10);
      existingMock.role = userRole;
      existingMock.otp = otp;
      existingMock.otpExpiry = otpExpiry;
      existingMock.lastOtpSentAt = lastOtpSentAt;

      console.log(`Attempting to send OTP to: ${cleanEmail}`);
      const sendResult = await sendOtpVerificationEmail({
        toEmail: cleanEmail,
        userName: existingMock.name,
        otpCode: otp,
      });
      console.log('OTP send result:', sendResult);

      return res.status(200).json({
        success: true,
        requiresVerification: true,
        email: cleanEmail,
        message: "Account already exists but is not verified. We've sent you a new verification code.",
      });
    }

    const newMockUser = {
      _id: `mock-${Date.now()}`,
      name,
      email: cleanEmail,
      passwordHash: bcrypt.hashSync(password, 10),
      role: userRole,
      isVerified: false,
      otp,
      otpExpiry,
      lastOtpSentAt,
      createdAt: new Date().toISOString(),
    };

    MOCK_USER_DATABASE.push(newMockUser);

    // Send OTP verification email for mock mode
    console.log(`Attempting to send OTP to: ${cleanEmail}`);
    const sendResult = await sendOtpVerificationEmail({
      toEmail: cleanEmail,
      userName: name,
      otpCode: otp,
    });
    console.log('OTP send result:', sendResult);

    return res.status(201).json({
      success: true,
      requiresVerification: true,
      email: cleanEmail,
      message: 'Registration successful! An OTP verification code has been sent to your email address (Mock DB).',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user (requires email to be verified)
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (getDBStatus() === 'Connected') {
      const user = await User.findOne({ email: cleanEmail }).select('+password');
      if (!user) {
        logAuthAttempt(req, cleanEmail, false, 'User not found');
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. User not found.',
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        logAuthAttempt(req, cleanEmail, false, 'Incorrect password', user);
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Password incorrect.',
        });
      }

      // Check if account is blocked/suspended
      if (user.isBlocked) {
        logAuthAttempt(req, cleanEmail, false, 'Account suspended/blocked', user);
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended. Contact admin for details.',
        });
      }

      // Check if user email is verified
      if (!user.isVerified) {
        logAuthAttempt(req, cleanEmail, false, 'Email unverified', user);
        return res.status(401).json({
          success: false,
          requiresVerification: true,
          email: user.email,
          message: 'Please verify your email address before logging in.',
        });
      }

      logAuthAttempt(req, cleanEmail, true, 'Login successful', user);
      return sendTokenResponse(user, 200, res);
    }

    // Mock fallback when DB disconnected
    const mockUser = MOCK_USER_DATABASE.find(u => u.email.toLowerCase() === cleanEmail);
    if (!mockUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const isMatch = bcrypt.compareSync(password, mockUser.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password credentials.',
      });
    }

    if (mockUser.isVerified === false) {
      return res.status(401).json({
        success: false,
        requiresVerification: true,
        email: mockUser.email,
        message: 'Please verify your email address before logging in.',
      });
    }

    return sendTokenResponse(mockUser, 200, res, 'Logged in using mock credentials (DB disconnected)');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP for user registration
 * @route   POST /api/auth/verify-otp
 * @access  Public
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and 6-digit OTP verification code.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    if (getDBStatus() === 'Connected') {
      const user = await User.findOne({ email: cleanEmail }).select('+otp');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email address.',
        });
      }

      if (user.isVerified) {
        return res.status(200).json({
          success: true,
          alreadyVerified: true,
          message: 'Email is already verified. You can sign in now.',
        });
      }

      if (!user.otp || user.otp !== cleanOtp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code. Please check and try again.',
        });
      }

      if (user.otpExpiry && new Date() > new Date(user.otpExpiry)) {
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please request a new OTP.',
        });
      }

      user.isVerified = true;
      user.otp = undefined;
      user.otpExpiry = undefined;
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Email verified successfully! You can now log in.',
      });
    }

    // Mock fallback when DB disconnected
    const mockUser = MOCK_USER_DATABASE.find(u => u.email.toLowerCase() === cleanEmail);
    if (!mockUser) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address (Mock DB).',
      });
    }

    if (mockUser.isVerified) {
      return res.status(200).json({
        success: true,
        alreadyVerified: true,
        message: 'Email is already verified. You can sign in now.',
      });
    }

    if (mockUser.otp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check and try again.',
      });
    }

    if (mockUser.otpExpiry && new Date() > new Date(mockUser.otpExpiry)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new OTP.',
      });
    }

    mockUser.isVerified = true;
    delete mockUser.otp;
    delete mockUser.otpExpiry;

    return res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Resend OTP verification code with 60s rate limit
 * @route   POST /api/auth/resend-otp
 * @access  Public
 */
const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email address.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (getDBStatus() === 'Connected') {
      const user = await User.findOne({ email: cleanEmail });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email address.',
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'This email account is already verified.',
        });
      }

      // 60-second rate limiting check
      if (user.lastOtpSentAt) {
        const secondsSince = (new Date() - new Date(user.lastOtpSentAt)) / 1000;
        if (secondsSince < 60) {
          const waitTime = Math.ceil(60 - secondsSince);
          return res.status(429).json({
            success: false,
            message: `Please wait ${waitTime} seconds before requesting a new OTP code.`,
          });
        }
      }

      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      user.otp = newOtp;
      user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      user.lastOtpSentAt = new Date();
      await user.save();

      await sendOtpVerificationEmail({
        toEmail: user.email,
        userName: user.name,
        otpCode: newOtp,
      });

      return res.status(200).json({
        success: true,
        message: 'A new OTP verification code has been sent to your email address.',
      });
    }

    // Mock fallback when DB disconnected
    const mockUser = MOCK_USER_DATABASE.find(u => u.email.toLowerCase() === cleanEmail);
    if (!mockUser) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email address (Mock DB).',
      });
    }

    if (mockUser.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'This email account is already verified.',
      });
    }

    if (mockUser.lastOtpSentAt) {
      const secondsSince = (new Date() - new Date(mockUser.lastOtpSentAt)) / 1000;
      if (secondsSince < 60) {
        const waitTime = Math.ceil(60 - secondsSince);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitTime} seconds before requesting a new OTP code.`,
        });
      }
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    mockUser.otp = newOtp;
    mockUser.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    mockUser.lastOtpSentAt = new Date();

    await sendOtpVerificationEmail({
      toEmail: mockUser.email,
      userName: mockUser.name,
      otpCode: newOtp,
    });

    return res.status(200).json({
      success: true,
      message: 'A new OTP verification code has been sent to your email address (Mock DB).',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Contact admin for details.',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        teacherApprovalStatus: user.teacherApprovalStatus || (user.role === 'teacher' ? 'pending' : 'approved'),
        isBlocked: !!user.isBlocked,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Forgot Password - request OTP reset code
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const genericResponse = {
      success: true,
      message: 'If an account exists with this email, a reset code has been sent.',
    };

    if (getDBStatus() === 'Connected') {
      const user = await User.findOne({ email: cleanEmail });

      if (!user) {
        return res.status(200).json(genericResponse);
      }

      if (!user.isVerified) {
        return res.status(400).json({
          success: false,
          requiresVerification: true,
          email: user.email,
          message: 'Your account is not verified yet. Please complete registration verification first.',
        });
      }

      if (user.lastResetOtpSentAt) {
        const secondsSince = (new Date() - new Date(user.lastResetOtpSentAt)) / 1000;
        if (secondsSince < 60) {
          const waitTime = Math.ceil(60 - secondsSince);
          return res.status(429).json({
            success: false,
            message: `Please wait ${waitTime} seconds before requesting a new reset code.`,
          });
        }
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetPasswordOtp = otp;
      user.resetPasswordOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
      user.lastResetOtpSentAt = new Date();
      await user.save();

      await sendForgotPasswordOtpEmail({
        toEmail: user.email,
        userName: user.name,
        otpCode: otp,
      });

      return res.status(200).json(genericResponse);
    }

    const mockUser = MOCK_USER_DATABASE.find(u => u.email.toLowerCase() === cleanEmail);
    if (!mockUser) {
      return res.status(200).json(genericResponse);
    }

    if (!mockUser.isVerified) {
      return res.status(400).json({
        success: false,
        requiresVerification: true,
        email: mockUser.email,
        message: 'Your account is not verified yet. Please complete registration verification first.',
      });
    }

    if (mockUser.lastResetOtpSentAt) {
      const secondsSince = (new Date() - new Date(mockUser.lastResetOtpSentAt)) / 1000;
      if (secondsSince < 60) {
        const waitTime = Math.ceil(60 - secondsSince);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitTime} seconds before requesting a new reset code.`,
        });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    mockUser.resetPasswordOtp = otp;
    mockUser.resetPasswordOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    mockUser.lastResetOtpSentAt = new Date();

    await sendForgotPasswordOtpEmail({
      toEmail: mockUser.email,
      userName: mockUser.name,
      otpCode: otp,
    });

    return res.status(200).json(genericResponse);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify OTP code for password reset and issue short-lived single-use reset token
 * @route   POST /api/auth/verify-reset-otp
 * @access  Public
 */
const verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and 6-digit verification code.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    if (getDBStatus() === 'Connected') {
      const user = await User.findOne({ email: cleanEmail }).select('+resetPasswordOtp +resetPasswordOtpExpiry');

      if (!user || !user.resetPasswordOtp || user.resetPasswordOtp !== cleanOtp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code. Please check and try again.',
        });
      }

      if (user.resetPasswordOtpExpiry && new Date() > new Date(user.resetPasswordOtpExpiry)) {
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please request a new OTP code.',
        });
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpiry = undefined;
      await user.save();

      return res.status(200).json({
        success: true,
        resetToken,
        message: 'Reset code verified successfully. You may now enter your new password.',
      });
    }

    const mockUser = MOCK_USER_DATABASE.find(u => u.email.toLowerCase() === cleanEmail);
    if (!mockUser || !mockUser.resetPasswordOtp || mockUser.resetPasswordOtp !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check and try again (Mock DB).',
      });
    }

    if (mockUser.resetPasswordOtpExpiry && new Date() > new Date(mockUser.resetPasswordOtpExpiry)) {
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new OTP code.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    mockUser.resetPasswordToken = resetToken;
    mockUser.resetPasswordTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);
    delete mockUser.resetPasswordOtp;
    delete mockUser.resetPasswordOtpExpiry;

    return res.status(200).json({
      success: true,
      resetToken,
      message: 'Reset code verified successfully (Mock DB). You may now enter your new password.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Set new password using single-use reset token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, reset token, and new password.',
      });
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirm password do not match.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (getDBStatus() === 'Connected') {
      const user = await User.findOne({ email: cleanEmail }).select('+resetPasswordToken +resetPasswordTokenExpiry +password');

      if (!user || !user.resetPasswordToken || user.resetPasswordToken !== resetToken) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired password reset token.',
        });
      }

      if (user.resetPasswordTokenExpiry && new Date() > new Date(user.resetPasswordTokenExpiry)) {
        return res.status(400).json({
          success: false,
          message: 'Password reset token has expired. Please request a new reset code.',
        });
      }

      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordTokenExpiry = undefined;
      await user.save();

      await sendPasswordResetSuccessEmail({
        toEmail: user.email,
        userName: user.name,
      });

      return res.status(200).json({
        success: true,
        message: 'Your ExamPortal password has been reset successfully! You can now log in with your new password.',
      });
    }

    const mockUser = MOCK_USER_DATABASE.find(u => u.email.toLowerCase() === cleanEmail);
    if (!mockUser || !mockUser.resetPasswordToken || mockUser.resetPasswordToken !== resetToken) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token (Mock DB).',
      });
    }

    if (mockUser.resetPasswordTokenExpiry && new Date() > new Date(mockUser.resetPasswordTokenExpiry)) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token has expired. Please request a new reset code.',
      });
    }

    mockUser.passwordHash = bcrypt.hashSync(newPassword, 10);
    delete mockUser.resetPasswordToken;
    delete mockUser.resetPasswordTokenExpiry;

    await sendPasswordResetSuccessEmail({
      toEmail: mockUser.email,
      userName: mockUser.name,
    });

    return res.status(200).json({
      success: true,
      message: 'Your ExamPortal password has been reset successfully! You can now log in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};
/**
 * @desc    Logout user / clear token
 * @route   GET /api/auth/logout
 * @access  Public
 */
const logoutUser = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'User logged out successfully.',
    token: null,
  });
};

module.exports = {
  registerUser,
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getMe,
  logoutUser,
};

