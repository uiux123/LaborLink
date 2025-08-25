// models/Customer.js
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      // NOTE: don't set select:false unless your login flow uses .select('+password')
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },

    // 🔐 Two-step verification fields
    verificationCode: {
      type: String,
      default: null,
    },
    codeExpiresAt: {
      type: Date,
      default: null,
    },
    twoStepEnabled: {
      type: Boolean,
      default: false, // initially disabled
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        // Hide sensitive fields from API responses
        delete ret.password;
        delete ret.verificationCode;
        delete ret.codeExpiresAt;
        return ret;
      },
    },
  }
);

// Optional: helpful uniqueness error messages
CustomerSchema.post('save', function (err, _doc, next) {
  if (err && err.code === 11000) {
    if (err.keyPattern?.username) return next(new Error('Username already exists'));
    if (err.keyPattern?.email) return next(new Error('Email already exists'));
  }
  next(err);
});

module.exports = mongoose.model('Customer', CustomerSchema);
