// models/Labor.js
const mongoose = require('mongoose');

const laborSchema = new mongoose.Schema(
  {
    // Basic profile
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
      // Don’t hide by default unless your login flow uses .select('+password')
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

    /**
     * Location (City/District) for filtering
     */
    location: {
      type: String,
      required: true,
      trim: true,
    },

    /**
     * Age category buckets for filtering
     */
    ageCategory: {
      type: String,
      required: true,
      enum: ['Young Adults', 'Adults', 'Middle-aged Workers', 'Senior Workers'],
    },

    /**
     * Primary skill category for filtering
     */
    skillCategory: {
      type: String,
      required: true,
      enum: [
        'Masons',
        'Electricians',
        'Plumbers',
        'Painters',
        'Carpenters',
        'Tile Layers',
        'Welders',
        'Roofers',
        'Helpers/General Labourers',
        'Scaffolders',
      ],
    },

    // Operational fields
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    dailyRate: {
      type: Number,
      min: 0,
    },

    // 🔐 Security Fields for OTP / 2-Step Verification
    twoStepEnabled: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
      default: null,
    },
    codeExpiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // Hide sensitive fields from API responses
        delete ret.password;
        delete ret.verificationCode;
        delete ret.codeExpiresAt;
        return ret;
      },
    },
  }
);

/**
 * Indexes for fast searching/filtering
 */
laborSchema.index({ name: 'text', location: 'text', address: 'text' });
laborSchema.index({ location: 1, skillCategory: 1, ageCategory: 1, isActive: 1 });

/**
 * Helpful uniqueness error messages
 */
laborSchema.post('save', function (err, _doc, next) {
  if (err && err.code === 11000) {
    if (err.keyPattern?.username) return next(new Error('Username already exists'));
    if (err.keyPattern?.email) return next(new Error('Email already exists'));
  }
  next(err);
});

module.exports = mongoose.model('Labor', laborSchema);
