const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['mcq-single', 'mcq-multiple', 'true-false', 'short-answer', 'essay'],
      default: 'mcq-single',
    },
    options: [{
      type: String,
      trim: true,
    }],
    correctAnswer: {
      type: mongoose.Schema.Types.Mixed,
      required: function() {
        // Essay type questions do not strictly require a single exact answer
        return this.type !== 'essay';
      },
    },
    marks: {
      type: Number,
      default: 1,
      min: [0, 'Marks cannot be negative'],
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: [0, 'Negative marks cannot be less than 0'],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    subject: {
      type: String,
      required: [true, 'Subject or domain tag is required'],
      default: 'General',
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    explanation: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Question', questionSchema);
