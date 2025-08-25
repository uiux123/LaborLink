// backend/controllers/paymentController.js
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Labor = require('../models/Labor');

let Customer;
try {
  Customer = require('../models/Customer'); // optional
} catch (e) {
  Customer = null;
}

const getUserId = (req) => (req.user?._id || req.user?.id || req.user?.userId || null);

const formatCurrencyLKR = (n) => {
  if (typeof n !== 'number') return '';
  try { return `Rs. ${n.toLocaleString()}`; } catch { return `Rs. ${n}`; }
};

/**
 * POST /payments/start
 * Body: { bookingId, provider? }
 * If using an external PSP (Stripe/PayHere), create a session and return { url }.
 * For now we return 200 with { url: null } so the FE uses the in‑app form.
 */
const startCardPaymentSession = async (req, res) => {
  try {
    const customerId = getUserId(req);
    if (!customerId) return res.status(401).json({ error: 'Unauthorized' });

    const { bookingId, provider } = req.body || {};
    if (!bookingId || !mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ error: 'Invalid bookingId' });
    }

    // Ensure the booking belongs to the requester and is accepted
    const booking = await Booking.findOne({ _id: bookingId, customerId })
      .populate('laborId', 'name skillCategory dailyRate')
      .populate('customerId', 'name email phone address');

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'accepted') {
      return res.status(400).json({ error: 'Payment is allowed only after acceptance' });
    }

    // If you wire an external provider, create a session here and return the hosted URL:
    // Example:
    // const session = await stripe.checkout.sessions.create({ ... });
    // return res.json({ url: session.url });

    // For now, return null to use the in-app form.
    return res.json({ url: null, provider: provider || 'in-app' });
  } catch (err) {
    console.error('startCardPaymentSession error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /payments/charge
 * Body: {
 *   bookingId,
 *   amount,
 *   card: { holder, number, expMonth, expYear, cvc }
 * }
 * Mocks a successful charge if card number ends with 4242.
 * Replace the mock with your real PSP logic (Stripe/PayHere/etc).
 */
const processCardPayment = async (req, res) => {
  try {
    const customerId = getUserId(req);
    if (!customerId) return res.status(401).json({ error: 'Unauthorized' });

    const { bookingId, amount, card } = req.body || {};
    if (!bookingId || !mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ error: 'Invalid bookingId' });
    }
    if (!card || !card.number || !card.expMonth || !card.expYear || !card.cvc) {
      return res.status(400).json({ error: 'Missing card details' });
    }

    const booking = await Booking.findOne({ _id: bookingId, customerId })
      .populate('laborId', 'name email phone skillCategory location dailyRate')
      .populate('customerId', 'name email phone address');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (booking.status !== 'accepted') {
      return res.status(400).json({ error: 'Cannot pay for a booking that is not accepted' });
    }

    // Determine the amount to charge: prefer explicit amount else labor dailyRate
    const chargeAmount =
      typeof amount === 'number'
        ? amount
        : (typeof booking?.laborId?.dailyRate === 'number' ? booking.laborId.dailyRate : null);

    if (typeof chargeAmount !== 'number') {
      return res.status(400).json({ error: 'Amount is required (labor dailyRate not available)' });
    }

    /* ---------------- MOCK PROCESSOR ----------------
       Accept any card number that ends with "4242".
       Replace this with real PSP integration.
    -------------------------------------------------- */
    const last4 = String(card.number).replace(/\s+/g, '').slice(-4);
    const ok = last4 === '4242'; // mock success rule
    if (!ok) {
      return res.status(402).json({ error: 'Card was declined (mock). Use a number ending with 4242.' });
    }

    // Mark booking as paid by card
    booking.paymentMethod = 'card';
    booking.paymentStatus = 'paid'; // Booking model hook sets paidAt
    await booking.save();

    // Notify labor of successful payment
    const laborId = booking.laborId?._id || booking.laborId;
    const amountText = formatCurrencyLKR(chargeAmount);

    await Notification.create({
      userId: laborId,
      role: 'labor',
      type: 'payment',
      title: 'Customer paid by card',
      message:
        `Payment received (${amountText}). The job is ready to proceed. ` +
        (booking?.customerId?.address ? `Location: ${booking.customerId.address}.` : ''),
      meta: {
        bookingId: booking._id,
        customerId,
        customerName: booking?.customerId?.name,
        customerPhone: booking?.customerId?.phone,
        customerEmail: booking?.customerId?.email,
        customerAddress: booking?.customerId?.address,
        paymentMethod: 'card',
        paymentStatus: booking.paymentStatus,
        paidAt: booking.paidAt || new Date(),
        jobDate: booking?.jobDate,
        laborName: booking?.laborId?.name,
        skillCategory: booking?.laborId?.skillCategory,
        amount: chargeAmount,
      },
    });

    return res.json({
      message: 'Payment successful',
      booking,
    });
  } catch (err) {
    console.error('processCardPayment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  startCardPaymentSession,
  processCardPayment,
};
