const mongoose = require('mongoose');

const authLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    success: {
      type: Boolean,
      required: true,
    },
    reason: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1',
    },
    role: {
      type: String,
      default: 'student',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AuthLog', authLogSchema);
