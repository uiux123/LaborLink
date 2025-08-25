// controllers/verificationController.js
const Customer = require('../models/Customer');
const Labor = require('../models/Labor');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET;

/* =========================================
   Mailer (Gmail via SMTP with App Password)
   ========================================= */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER, // full Gmail address
    pass: process.env.EMAIL_PASS, // 16-char App Password
  },
});

// Verify SMTP transport once (first use)
let transporterVerified = false;
const ensureTransport = async () => {
  if (transporterVerified) return;
  await transporter.verify();
  transporterVerified = true;
};

/* -------------------------------------------
   Helpers
-------------------------------------------- */
const generateVerificationCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes

const sendOtpEmail = async (toEmail, code) => {
  await ensureTransport();
  return transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: 'Your 2-Step Verification Code',
    text: `Your verification code is: ${code}. It will expire in 10 minutes.`,
  });
};

// escape regex special chars for safe exact match
const escapeRegex = (s = '') =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// case-insensitive exact email matcher (handles legacy mixed-case emails)
const emailCi = (email) => ({
  email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') },
});

/**
 * Resolve a user from req.user ({id, role}) or fallback to explicit customerId (legacy).
 * Returns: { user, role } where role is 'Customer' | 'Labor' | null
 */
const resolveUser = async ({ req, fallbackCustomerId = null }) => {
  if (req.user?.id && req.user?.role) {
    const roleLc = String(req.user.role).toLowerCase();
    if (roleLc === 'customer') {
      const user = await Customer.findById(req.user.id);
      return { user, role: 'Customer' };
    }
    if (roleLc === 'labor') {
      const user = await Labor.findById(req.user.id);
      return { user, role: 'Labor' };
    }
  }
  if (fallbackCustomerId) {
    const user = await Customer.findById(fallbackCustomerId);
    return { user, role: 'Customer' };
  }
  return { user: null, role: null };
};

/* =========================
   Customer Two-Step (enable/disable)
   Body: { enable, customerId? }
   ========================= */
const toggleTwoStepVerification = async (req, res) => {
  try {
    const { enable, customerId } = req.body;
    if (typeof enable !== 'boolean') {
      return res.status(400).json({ error: 'Invalid enable flag' });
    }

    const { user: customer } = await resolveUser({ req, fallbackCustomerId: customerId || null });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    if (enable) {
      // Generate OTP and attempt to send email first
      const code = generateVerificationCode();
      const expiry = new Date(Date.now() + OTP_TTL_MS);

      try {
        await sendOtpEmail(customer.email, code);
      } catch (mailErr) {
        console.error('✉️  Email send failed (customer enable 2-step):', mailErr?.message || mailErr);
        return res.status(502).json({
          error: 'Could not send verification email. Please try again.',
          details: 'MAIL_SEND_FAILED',
        });
      }

      // Persist only after successful email
      customer.twoStepEnabled = true;
      customer.verificationCode = code;
      customer.codeExpiresAt = expiry;
      await customer.save();

      return res.status(200).json({
        message: '2-Step enabled. OTP sent to your email.',
        twoStepEnabled: true,
        expiresAt: customer.codeExpiresAt,
      });
    } else {
      // Disable & clear
      customer.twoStepEnabled = false;
      customer.verificationCode = null;
      customer.codeExpiresAt = null;
      await customer.save();

      return res.status(200).json({
        message: '2-Step verification disabled.',
        twoStepEnabled: false,
      });
    }
  } catch (err) {
    console.error('Error toggling 2-step (customer):', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const sendOTP = async (req, res) => {
  try {
    const { customerId } = req.body || {};
    const { user: customer } = await resolveUser({ req, fallbackCustomerId: customerId || null });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + OTP_TTL_MS);

    try {
      await sendOtpEmail(customer.email, code);
    } catch (mailErr) {
      console.error('✉️  Email send failed (customer resend OTP):', mailErr?.message || mailErr);
      return res.status(502).json({
        error: 'Could not send verification email. Please try again.',
        details: 'MAIL_SEND_FAILED',
      });
    }

    customer.verificationCode = code;
    customer.codeExpiresAt = expiry;
    await customer.save();

    res.status(200).json({
      message: 'OTP sent to your email.',
      expiresAt: expiry,
    });
  } catch (err) {
    console.error('Error sending OTP (customer):', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* =========================
   Labor Two-Step
   ========================= */
const toggleTwoStepForLabor = async (req, res) => {
  try {
    const { enable } = req.body;
    if (typeof enable !== 'boolean') {
      return res.status(400).json({ error: 'Invalid enable flag' });
    }

    const { user: labor } = await resolveUser({ req });
    if (!labor) return res.status(404).json({ error: 'Labor not found' });

    if (enable) {
      const code = generateVerificationCode();
      const expiry = new Date(Date.now() + OTP_TTL_MS);

      try {
        await sendOtpEmail(labor.email, code);
      } catch (mailErr) {
        console.error('✉️  Email send failed (labor enable 2-step):', mailErr?.message || mailErr);
        return res.status(502).json({
          error: 'Could not send verification email. Please try again.',
          details: 'MAIL_SEND_FAILED',
        });
      }

      labor.twoStepEnabled = true;
      labor.verificationCode = code;
      labor.codeExpiresAt = expiry;
      await labor.save();

      return res.status(200).json({
        message: 'Two-step enabled. OTP sent to your email.',
        twoStepEnabled: true,
        expiresAt: labor.codeExpiresAt,
      });
    } else {
      labor.twoStepEnabled = false;
      labor.verificationCode = null;
      labor.codeExpiresAt = null;
      await labor.save();

      return res.status(200).json({
        message: 'Two-step verification disabled.',
        twoStepEnabled: false,
      });
    }
  } catch (err) {
    console.error('Error toggling 2-step (labor):', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const sendOTPLabor = async (req, res) => {
  try {
    const { user: labor } = await resolveUser({ req });
    if (!labor) return res.status(404).json({ error: 'Labor not found' });

    const code = generateVerificationCode();
    const expiry = new Date(Date.now() + OTP_TTL_MS);

    try {
      await sendOtpEmail(labor.email, code);
    } catch (mailErr) {
      console.error('✉️  Email send failed (labor resend OTP):', mailErr?.message || mailErr);
      return res.status(502).json({
        error: 'Could not send verification email. Please try again.',
        details: 'MAIL_SEND_FAILED',
      });
    }

    labor.verificationCode = code;
    labor.codeExpiresAt = expiry;
    await labor.save();

    res.status(200).json({
      message: 'OTP sent to your email.',
      expiresAt: expiry,
    });
  } catch (err) {
    console.error('Error sending OTP (labor):', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/* =========================
   Shared verify-code (role-aware)
   Body: { email, code, role? }
   ========================= */
const verifyCode = async (req, res) => {
  try {
    let { email, code, role } = req.body || {};

    // Normalize inputs
    email = (email || '').trim();         // keep original for regex but trimmed
    const emailLc = email.toLowerCase();  // for fallback logic
    const inputCode = String(code ?? '').trim();
    const roleNorm = String(role || '').trim().toLowerCase(); // '', 'customer', 'labor'

    if (!email || !inputCode) {
      return res.status(400).json({ error: 'Email and code are required.' });
    }

    let user = null;
    let resolvedRole = null;

    // Prioritize role if provided (case-insensitive) with case-insensitive email match
    if (roleNorm === 'customer') {
      user = await Customer.findOne(emailCi(email));
      resolvedRole = 'Customer';
    } else if (roleNorm === 'labor') {
      user = await Labor.findOne(emailCi(email));
      resolvedRole = 'Labor';
    } else {
      // Try both; prefer the one that currently has an OTP
      const [cust, lab] = await Promise.all([
        Customer.findOne(emailCi(email)),
        Labor.findOne(emailCi(email)),
      ]);
      if (cust?.verificationCode && cust?.codeExpiresAt) {
        user = cust; resolvedRole = 'Customer';
      } else if (lab?.verificationCode && lab?.codeExpiresAt) {
        user = lab; resolvedRole = 'Labor';
      } else {
        // As a final fallback, try lowercased exact (in case regex blocked)
        const [cust2, lab2] = await Promise.all([
          Customer.findOne({ email: emailLc }),
          Labor.findOne({ email: emailLc }),
        ]);
        if (cust2?.verificationCode && cust2?.codeExpiresAt) {
          user = cust2; resolvedRole = 'Customer';
        } else if (lab2?.verificationCode && lab2?.codeExpiresAt) {
          user = lab2; resolvedRole = 'Labor';
        } else {
          if (cust || lab || cust2 || lab2) {
            return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
          }
          return res.status(404).json({ error: 'User not found for this email' });
        }
      }
    }

    if (!user) return res.status(404).json({ error: 'User not found for this email' });

    // Validate presence of OTP + expiry
    if (!user.verificationCode || !user.codeExpiresAt) {
      return res.status(400).json({ error: 'No verification code found. Please request a new one.' });
    }
    if (user.codeExpiresAt < new Date()) {
      return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
    }

    // Compare as strings to avoid number/string mismatch
    const storedCode = String(user.verificationCode).trim();
    if (storedCode !== inputCode) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Success: clear OTP + issue token
    user.verificationCode = null;
    user.codeExpiresAt = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username, role: resolvedRole },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Verification successful.',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: resolvedRole,
      },
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  toggleTwoStepVerification,
  sendOTP,
  toggleTwoStepForLabor,
  sendOTPLabor,
  verifyCode,
};

