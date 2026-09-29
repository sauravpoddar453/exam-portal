const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  questionTextSnapshot: {
    type: String,
    default: '',
  },
  questionTypeSnapshot: {
    type: String,
    default: '',
  },
  optionsSnapshot: [String],
  selectedOption: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  correctAnswerSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  explanationSnapshot: {
    type: String,
    default: '',
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
  marksAwarded: {
    type: Number,
    default: 0,
  },
  timeSpentOnQuestion: {
    type: Number,
    default: 0,
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
    enum: ['tab-switch', 'window-blur', 'fullscreen-exit', 'copy-paste-attempt', 'camera-violation', 'face-not-detected', 'multiple-faces-detected', 'looking-away'],
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
    cameraViolationCount: {
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
    timeTaken: {
      type: Number,
      default: 0,
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
