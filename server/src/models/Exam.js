const mongoose = require('mongoose');

const examQuestionSchema = new mongoose.Schema({
  question: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  marksOverride: {
    type: Number,
    default: null,
  },
});

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Exam code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'General',
      trim: true,
    },
    questions: [examQuestionSchema],
    durationMinutes: {
      type: Number,
      required: true,
      default: 60,
      min: [1, 'Duration must be at least 1 minute'],
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    totalMarks: {
      type: Number,
      default: 100,
    },
    passingMarks: {
      type: Number,
      default: 40,
    },
    attemptsAllowed: {
      type: Number,
      default: 1,
      min: [1, 'At least 1 attempt must be allowed'],
    },
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    shuffleOptions: {
      type: Boolean,
      default: false,
    },
    negativeMarking: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    reminderSent: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Exam must belong to a course'],
    },
    isUnderReview: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Exam', examSchema);
