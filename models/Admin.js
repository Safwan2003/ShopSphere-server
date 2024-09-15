const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: true },
  resetPasswordToken: { type: String },  // Token for password recovery
  resetPasswordExpires: { type: Date },  // Expiration time for the reset token
  emailVerificationToken: { type: String },  // Token for email verification
  emailVerified: { type: Boolean, default: false },  // Email verification status
  roles: { type: [String], default: ['admin'] },  // Role-Based Access Control
  failedLoginAttempts: { type: Number, default: 0 },  // Track failed login attempts for account lockout
  lockUntil: { type: Date },  // Timestamp for when the account is locked until
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
