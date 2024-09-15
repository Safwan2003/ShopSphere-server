// models/Reward.js
const mongoose = require('mongoose');

const rewardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  points: { type: Number, default: 0 },
}, { timestamps: true });

const Reward = mongoose.model('Reward', rewardSchema);
module.exports = Reward;
