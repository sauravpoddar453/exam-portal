const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getDBStatus } = require('../config/db');
const { MOCK_USERS_BY_TOKEN } = require('../middleware/authMiddleware');
const { sendOtpVerificationEmail } = require('../services/emailService');

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

    const validRoles = ['admin', 'teacher', 'student'];
    const userRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'student';
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
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. User not found.',
        });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Password incorrect.',
        });
      }

      // Check if account is blocked/suspended
      if (user.isBlocked) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been suspended. Contact admin for details.',
        });
      }

      // Check if user email is verified
      if (!user.isVerified) {
        return res.status(401).json({
          success: false,
          requiresVerification: true,
          email: user.email,
          message: 'Please verify your email address before logging in.',
        });
      }

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
  getMe,
  logoutUser,
};

