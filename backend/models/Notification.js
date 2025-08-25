const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    // Recipient of the notification
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    // So we can filter fast by audience if needed
    role: { type: String, enum: ['customer', 'labor', 'admin'], required: true, index: true },

    // Domain/type (we’ll use "booking" for this flow)
    type: { type: String, default: 'booking', index: true },

    // Display content
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },

    // Extra payload (e.g., bookingId, laborId, laborName, skillCategory, decision/workStatus)
    meta: { type: Object, default: {} },

    // Read/unread
    read: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Useful compound index for notification feeds
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
