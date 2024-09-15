const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Admin = require('../models/Admin');
const router = express.Router();

const auth = require('../middleware/admin');
const { check, validationResult } = require('express-validator');

// Password Complexity Regex
const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

// Initialize Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // Corrected from 'admin' to 'user'
    pass: process.env.GMAIL_PASS,
  },
});

// Auto Logout Configuration
const TOKEN_EXPIRATION_TIME = '2hr';

// Account Lockout Settings
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TIME = 30 * 60 * 1000; // 30 minutes

//get admin data
router.get('/getadmin', auth, async (req, res) => {
  try {
    const adminId = req.admin.id;
    const admin = await Admin.findById(adminId);

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.json(admin);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Server error' });
  }
});



// Admin Registration Route
// Admin Registration Route
router.post(
  '/register',
    [
      check('email').isEmail().withMessage('Must be a valid email'),
      check('password')
        .matches(passwordRegex)
        .withMessage(
          'Password must be at least 8 characters long, contain at least one lowercase letter, one uppercase letter, one digit, and one special character'
        ),
    ],
    async (req, res) => {
      const { name, email, password } = req.body;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      try {
        let admin = await Admin.findOne({ email });
        if (admin) return res.status(400).json({ message: 'Admin already exists' });
  
        // Generate email verification token
        const emailVerificationToken = crypto.randomBytes(5).toString('hex').slice(0,4);
  
        // Send verification email
        const verificationLink = `${emailVerificationToken}`;
        await transporter.sendMail({
          to: email,
          subject: 'Verify your email',
          text: `Add the code  to verify your email:  \n ${verificationLink}`,
        });
  
        // If email was sent successfully, hash the password and save the admin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
  
        admin = new Admin({
          name,
          email,
          password: hashedPassword,
          isAdmin: true,
          emailVerificationToken,  // Store the token in the admin document
          emailVerified: false,  // Initially set to false until verified

        });
  
        await admin.save();
  
        const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRATION_TIME });
        res.json({ token });
      } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
      }
    }
  );
  
// Admin Login with Account Lockout and CAPTCHA
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let admin = await Admin.findOne({ email });
    console.log(admin)
console.log(req.body)
    if (!admin) return res.status(400).json({ message: 'Invalid credentials' });

    // Check for account lockout
    if (admin.lockUntil && admin.lockUntil > Date.now()) {
      return res.status(403).json({ message: 'Account is locked. Try again later.' });
    }


    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

console.log(hashedPassword)
console.log(admin.password)
    const isMatch = await bcrypt.compare(password, admin.password);
   console.log(isMatch)
    if (!isMatch) {
      // Increment failed login attempts
      admin.failedLoginAttempts += 1;
      if (admin.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        admin.lockUntil = Date.now() + LOCKOUT_TIME;
      }
      await admin.save();
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Reset failed login attempts on successful login
    admin.failedLoginAttempts = 0;
    admin.lockUntil = undefined; // Reset lockout
    await admin.save();

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: TOKEN_EXPIRATION_TIME });
    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Password Recovery
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: 'Admin not found' });

    // Generate reset token
    const resetToken = crypto.randomBytes(5).toString('hex').slice(0,5);
    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await admin.save();

    // Send reset email
    const resetCode = `${resetToken}`;
    await transporter.sendMail({
      to: email,
      subject: 'Password Reset',
      html: `Enter your code to reset your password: <strong>${resetCode}</strong>`,
    });

    res.json({ message: 'Password reset link has been sent to your email.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  try {
    const admin = await Admin.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!admin) return res.status(400).json({ message: 'Invalid or expired token' });

    // Validate new password
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: 'Password does not meet complexity requirements' });
    }
    
console.log(newPassword)
    // Hash new password and save
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);
  console.log(newPassword+"\n"+admin.password)
  
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;

    await admin.save();

    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// // Enable/Disable MFA (Multi-Factor Authentication)
// router.post('/enable-mfa', auth, async (req, res) => {
//   try {
//     const admin = await Admin.findById(req.admin.id);
//     if (!admin) return res.status(400).json({ message: 'Admin not found' });

//     admin.mfaEnabled = !admin.mfaEnabled;
//     if (admin.mfaEnabled) {
//       admin.mfaCode = crypto.randomBytes(20).toString('hex');
//       // Send MFA code via email (implement SMS if needed)
//       await transporter.sendMail({
//         to: admin.email,
//         subject: 'MFA Enabled',
//         text: `Your MFA code is: ${admin.mfaCode}`,
//       });
//     } else {
//       admin.mfaCode = undefined;
//     }

//     await admin.save();
//     res.json({ message: `MFA has been ${admin.mfaEnabled ? 'enabled' : 'disabled'}.` });
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).json({ message: 'Server error' });
//   }
// });







// src/routes/admin.js
router.post('/verify-code', async (req, res) => {
    const { code } = req.body;
    try {


        console.log('Verification Code:', code);

      // Find the admin based on the verification code
      const admin = await Admin.findOne({
        emailVerificationToken: code,
        emailVerified: false // Ensure that we're only checking for unverified accounts
      });
      console.log('Admin Found:', admin);

      if (!admin) {
        return res.status(400).json({ message: 'Invalid or expired verification code' });
      }
  
      // Verify the email
      admin.emailVerified = true;
      admin.emailVerificationToken = undefined; // Clear the token
      await admin.save();
  
      res.json({ message: 'Email successfully verified' });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Server error' });
    }
  });
    



module.exports = router;
