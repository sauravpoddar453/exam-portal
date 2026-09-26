const { getDBStatus } = require('../config/db');

/**
 * @desc    Get system health status
 * @route   GET /api/health
 * @access  Public
 */
const getHealthStatus = (req, res) => {
  const dbState = getDBStatus();
  
  res.status(200).json({
    success: true,
    message: 'Exam Portal Backend API is running smoothly',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(process.uptime())} seconds`,
    database: {
      status: dbState,
      isOperational: dbState === 'Connected',
    },
    version: '1.0.0',
  });
};

module.exports = { getHealthStatus };
