const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Helper function to increment a numeric setting value atomically
settingSchema.statics.incrementKey = async function (keyName, step = 1) {
  try {
    const updated = await this.findOneAndUpdate(
      { key: keyName },
      { $inc: { value: step } },
      { upsert: true, new: true }
    );
    return updated.value;
  } catch (err) {
    console.error(`[Setting] Error incrementing key ${keyName}:`, err.message);
    return 0;
  }
};

module.exports = mongoose.model('Setting', settingSchema);
