const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  selectedOption: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  isMarkedForReview: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['auto-graded', 'pending-review', 'manually-graded'],
    default: 'auto-graded',
  },
  marksObtained: {
    type: Number,
    default: 0,
  },
  feedback: {
    type: String,
    default: '',
  },
  savedAt: {
    type: Date,
    default: Date.now,
  },
});

const proctoringLogSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: ['tab-switch', 'window-blur', 'fullscreen-exit', 'copy-paste-attempt'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  details: {
    type: String,
    default: '',
  },
});

const attemptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    answers: [answerSchema],
    proctoringLogs: [proctoringLogSchema],
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
    fullscreenExitCount: {
      type: Number,
      default: 0,
    },
    isFlagged: {
      type: Boolean,
      default: false,
    },
    autoSubmitted: {
      type: Boolean,
      default: false,
    },
    autoSubmitReason: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    remainingSeconds: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['in-progress', 'submitted', 'timed-out'],
      default: 'in-progress',
    },
    gradingStatus: {
      type: String,
      enum: ['graded', 'pending-review'],
      default: 'graded',
    },
    score: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    passingMarks: {
      type: Number,
      default: 0,
    },
    isPassed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Attempt', attemptSchema);
