const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getDBStatus } = require('../config/db');

// In-memory user store for mock state when DB is disconnected
const MOCK_USERS_BY_TOKEN = new Map();

/**
 * Protect routes - Verify JWT token and attach user to req.user
 */
const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization || req.headers.Authorization;
  console.log(`[AUTH_MIDDLEWARE DIAGNOSTIC] Path: ${req.originalUrl || req.url} | Authorization Header: "${authHeader || '(NONE)'}"`);

  if (
    authHeader &&
    authHeader.startsWith('Bearer')
  ) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    console.warn(`[AUTH_MIDDLEWARE DIAGNOSTIC] Token missing for ${req.originalUrl || req.url}`);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Token missing.',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'exam_portal_jwt_secret_key_2026_super_secure'
    );

    if (getDBStatus() === 'Connected') {
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User no longer exists.',
        });
      }
    } else {
      // DB disconnected mock user resolution
      const mockUser = MOCK_USERS_BY_TOKEN.get(token) || {
        _id: decoded.id,
        name: decoded.name || 'Mock User',
        email: decoded.email || 'user@example.com',
        role: decoded.role || 'student',
      };
      req.user = mockUser;
    }

    if (req.user && req.user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Contact admin for details.',
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Invalid token.',
    });
  }
};

/**
 * Grant access to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'guest'}' is forbidden from accessing this resource. Allowed roles: [${roles.join(', ')}]`,
      });
    }
    next();
  };
};

module.exports = { protect, authorize, MOCK_USERS_BY_TOKEN };
