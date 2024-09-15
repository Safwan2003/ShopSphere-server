// models/RewardPolicy.js
const mongoose = require('mongoose');

const rewardPolicySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  pointsPerCurrencyUnit: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const RewardPolicy = mongoose.model('RewardPolicy', rewardPolicySchema);

module.exports = RewardPolicy;
