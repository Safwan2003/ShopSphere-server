// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  isAdmin: { type: Boolean, default: false },
  googleId: { type: String },
}, { timestamps: true });



const User = mongoose.model('User', userSchema);
module.exports = User;
