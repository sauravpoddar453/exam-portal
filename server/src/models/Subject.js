const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Case-insensitive duplicate check pre-save hook
subjectSchema.pre('save', async function (next) {
  if (this.isModified('name')) {
    const existing = await this.constructor.findOne({
      createdBy: this.createdBy,
      _id: { $ne: this._id },
      name: { $regex: new RegExp(`^${this.name.trim()}$`, 'i') },
    });
    if (existing) {
      return next(new Error(`Subject "${existing.name}" already exists`));
    }
  }
  next();
});

// Compound index
subjectSchema.index({ createdBy: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
