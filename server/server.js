const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { connectDB } = require('./src/config/db');

// Load environment variables
dotenv.config();

console.log('ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY);
console.log('ANTHROPIC_API_KEY length:', process.env.ANTHROPIC_API_KEY?.length || 0);

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Dynamic multi-origin CORS setup
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(url => url.trim().replace(/\/+$/, ''))
  : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'];

// Middleware
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes('*') || allowedOrigins.includes(cleanOrigin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy restriction: Origin ${origin} is not allowed`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logger
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// API Routes
const healthRoutes = require('./src/routes/healthRoutes');
const examRoutes = require('./src/routes/examRoutes');
const authRoutes = require('./src/routes/authRoutes');
const questionRoutes = require('./src/routes/questionRoutes');
const attemptRoutes = require('./src/routes/attemptRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const courseRoutes = require('./src/routes/courseRoutes');
const { testEmailDebug } = require('./src/services/emailService');

app.get('/api/test-email', testEmailDebug);
app.use('/api/health', healthRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courses', courseRoutes);

// Root route redirect/welcome
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Welcome to the Exam Portal API Server',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      healthCheck: '/api/health',
      exams: '/api/exams',
      auth: '/api/auth',
      questions: '/api/questions',
      attempts: '/api/attempts',
      courses: '/api/courses',
      admin: '/api/admin',
    },
  });
});

// Error handling middleware
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
app.use(notFound);
app.use(errorHandler);

// Background Email Reminder Scheduler and SMTP Verification
const { initReminderScheduler } = require('./src/services/reminderScheduler');
const { verifyTransporterOnStartup } = require('./src/services/emailService');

// Start listening
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`[Server] Exam Portal API Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`[Server] Health Check available at http://localhost:${PORT}/api/health`);
  console.log(`[Server] Admin Control API mounted at http://localhost:${PORT}/api/admin`);
  
  // Verify SMTP connection on startup
  verifyTransporterOnStartup();

  // Start 30-min pre-exam reminder background scheduler
  initReminderScheduler();
});
