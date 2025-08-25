// backend/models/Booking.js
const mongoose = require('mongoose');

/**
 * Mapping between decision and status
 * decision -> status:  requested→pending, accepted→accepted, declined→rejected, cancelled→cancelled
 * status   -> decision: pending→requested, accepted→accepted, rejected→declined, cancelled→cancelled
 */
const decisionToStatus = (d) => {
  switch (d) {
    case 'requested': return 'pending';
    case 'accepted':  return 'accepted';
    case 'declined':  return 'rejected';
    case 'cancelled': return 'cancelled';
    default:          return 'pending';
  }
};
const statusToDecision = (s) => {
  switch (s) {
    case 'pending':   return 'requested';
    case 'accepted':  return 'accepted';
    case 'rejected':  return 'declined';
    case 'cancelled': return 'cancelled';
    default:          return 'requested';
  }
};

const BookingSchema = new mongoose.Schema(
  {
    // Parties
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    laborId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Labor',     required: true, index: true },

    // Optional details
    note:    { type: String, trim: true },
    jobDate: { type: Date },

    // Primary lifecycle (kept for compatibility)
    decision: {
      type: String,
      enum: ['requested', 'accepted', 'declined', 'cancelled'],
      default: 'requested',
      index: true,
      required: true,
    },

    // Secondary lifecycle for querying/filtering
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
      required: true,
    },

    // Work progress AFTER acceptance
    workStatus: {
      type: String,
      enum: {
        values: ['pending', 'done'],
        message: 'workStatus must be pending or done',
      },
      default: 'pending',
      index: true,
      required: true,
    },

    // ---- Payment fields (NEW) ----
    // Selected by customer after acceptance: 'cash' or 'card'
    paymentMethod: {
      type: String,
      enum: {
        values: ['cash', 'card'],
        message: 'paymentMethod must be cash or card',
      },
      default: null,   // allow not selected yet
      required: false,
      index: true,
    },
    // Lifecycle of a payment: 'pending' (waiting cash handover or card charge) or 'paid'
    paymentStatus: {
      type: String,
      enum: {
        values: ['pending', 'paid'],
        message: 'paymentStatus must be pending or paid',
      },
      default: null,
      required: false,
      index: true,
    },
    // Timestamp when payment was confirmed
    paidAt: { type: Date, default: null },

    // Timestamps for transitions
    acceptedAt:  { type: Date, default: null },
    declinedAt:  { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

/* ------------------------------------------
   Keep decision <-> status synchronized
------------------------------------------- */
BookingSchema.pre('validate', function (next) {
  // If decision changed (or is new), set status accordingly
  if (this.isModified('decision') || this.isNew) {
    this.status = decisionToStatus(this.decision);
  }
  // If status changed directly, mirror back to decision
  if (this.isModified('status')) {
    this.decision = statusToDecision(this.status);
  }
  next();
});

/* ------------------------------------------
   Maintain transition timestamps & work flags
------------------------------------------- */
BookingSchema.pre('save', function (next) {
  // Decision transitions
  if (this.isModified('decision')) {
    const d = this.decision;

    if (d === 'accepted' && !this.acceptedAt) {
      this.acceptedAt = new Date();
      // Ensure a valid workStatus exists after acceptance
      if (!this.workStatus) this.workStatus = 'pending';
    }
    if (d === 'declined' && !this.declinedAt)   this.declinedAt   = new Date();
    if (d === 'cancelled' && !this.cancelledAt) this.cancelledAt  = new Date();

    // Moving away from accepted resets work progress flags
    if (d !== 'accepted') {
      this.workStatus  = 'pending';
      this.completedAt = null;
    }
  }

  // Work completion timestamp handling
  if (this.isModified('workStatus') && this.workStatus === 'done' && !this.completedAt) {
    this.completedAt = new Date();
  }
  if (this.isModified('workStatus') && this.workStatus === 'pending' && this.completedAt) {
    this.completedAt = null;
  }

  // Payment timestamp handling (NEW)
  if (this.isModified('paymentStatus')) {
    if (this.paymentStatus === 'paid' && !this.paidAt) {
      this.paidAt = new Date();
    }
    if ((this.paymentStatus === null || this.paymentStatus === 'pending') && this.paidAt) {
      // If reverted from paid → pending/null, clear paidAt
      this.paidAt = null;
    }
  }

  next();
});

/* ------------------------------------------
   Useful indexes
------------------------------------------- */
BookingSchema.index({ laborId: 1, status: 1, createdAt: -1 });
BookingSchema.index({ customerId: 1, status: 1, createdAt: -1 });
BookingSchema.index({ jobDate: 1 });

// Payment-oriented indexes (NEW)
BookingSchema.index({ customerId: 1, paymentStatus: 1, createdAt: -1 });
BookingSchema.index({ laborId: 1, paymentStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Booking', BookingSchema);