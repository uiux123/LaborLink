// controllers/loginController.js
const Customer = require('../models/Customer');
const Labor = require('../models/Labor');
const Admin = require('../models/Admin');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET;

// --- Nodemailer (Gmail) transporter ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Gmail address
    pass: process.env.EMAIL_PASS, // Gmail App Password (not login password)
  },
});

// 6-digit code
const generateVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * POST /api/laborlink/login
 * body: { username, password, role: 'Customer' | 'Labor' | 'Admin' }
 */
const loginUser = async (req, res) => {
  const { username, password, role } = req.body;

  try {
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'username, password, and role are required' });
    }
    if (!JWT_SECRET) {
      return res.status(500).json({ error: 'Server misconfigured: JWT secret missing' });
    }

    // ---------- CUSTOMER (with optional 2-step verification) ----------
    if (role === 'Customer') {
      const user = await Customer.findOne({ username }).select('+password');
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

      if (user.twoStepEnabled) {
        const code = generateVerificationCode();
        const expiry = new Date(Date.now() + 10 * 60 * 1000);

        user.verificationCode = code;
        user.codeExpiresAt = expiry;
        await user.save();

        await transporter.sendMail({
          from: `"LaborLink Verification" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Your Verification Code',
          html: `<p>Your verification code is: <b>${code}</b></p><p>This code will expire in 10 minutes.</p>`,
        });

        return res.status(200).json({
          message: 'Verification code sent to your email',
          requiresVerification: true,
          userId: user._id,
          email: user.email,
          role: 'Customer',
        });
      }

      // two-step disabled
      const token = jwt.sign(
        { id: user._id, username: user.username, role: 'Customer' },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      return res.status(200).json({
        message: 'Customer login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: 'Customer',
        },
        twoStepEnabled: false,
      });
    }

    // ---------- LABOR (with optional 2-step verification) ----------
    if (role === 'Labor') {
      const user = await Labor.findOne({ username }).select('+password');
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

      if (user.twoStepEnabled) {
        const code = generateVerificationCode();
        const expiry = new Date(Date.now() + 10 * 60 * 1000);

        user.verificationCode = code;
        user.codeExpiresAt = expiry;
        await user.save();

        await transporter.sendMail({
          from: `"LaborLink Verification" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: 'Your Verification Code',
          html: `<p>Your verification code is: <b>${code}</b></p><p>This code will expire in 10 minutes.</p>`,
        });

        return res.status(200).json({
          message: 'Verification code sent to your email',
          requiresVerification: true,
          userId: user._id,
          email: user.email,
          role: 'Labor',
        });
      }

      // two-step disabled
      const token = jwt.sign(
        { id: user._id, username: user.username, role: 'Labor' },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      return res.status(200).json({
        message: 'Labor login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: 'Labor',
        },
      });
    }

    // ---------- ADMIN ----------
    if (role === 'Admin') {
      const user = await Admin.findOne({ username }).select('+password');
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign(
        { id: user._id, username: user.username, role: 'Admin' },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      return res.status(200).json({
        message: 'Admin login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: 'Admin',
        },
      });
    }

    return res.status(400).json({ error: 'Invalid role' });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { loginUser };
