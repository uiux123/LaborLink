const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const Labor = require('../models/Labor');
// If you have a Customer model, we can use it to pull clean contact details
let Customer;
try {
  // Optional import; don't crash if module not present
  Customer = require('../models/Customer');
} catch (e) {
  Customer = null;
}

// Helper: extract user id from token payload safely
const getUserId = (req) => (req.user?._id || req.user?.id || req.user?.userId || null);

// Small helper to safely stringify amounts
const formatCurrencyLKR = (n) => {
  if (typeof n !== 'number') return '';
  try { return `Rs. ${n.toLocaleString()}`; } catch { return `Rs. ${n}`; }
};

// ========================= CORE BOOKING FLOWS =========================

/**
 * POST /bookings  (Customer)
 * body: { laborId, note?, jobDate? }
 */
const createBooking = async (req, res) => {
  try {
    const customerId = getUserId(req);
    const { laborId, note, jobDate } = req.body;

    if (!customerId) return res.status(401).json({ error: 'Unauthorized' });
    if (!laborId) return res.status(400).json({ error: 'laborId is required' });

    // sanity: ensure labor exists/active
    const labor = await Labor.findById(laborId).select('name skillCategory isActive');
    if (!labor) return res.status(404).json({ error: 'Labor not found' });
    if (labor.isActive === false) {
      return res.status(400).json({ error: 'Labor is not currently accepting bookings' });
    }

    const booking = await Booking.create({
      customerId,
      laborId,
      note: note || '',
      jobDate: jobDate ? new Date(jobDate) : undefined,
      // defaults handled by schema (decision=requested, status=pending)
    });

    return res.status(201).json({ message: 'Booking request created', booking });
  } catch (err) {
    console.error('createBooking error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /bookings  (Customer)
 * Query own bookings (most recent first)
 */
const getCustomerBookings = async (req, res) => {
  try {
    const customerId = getUserId(req);
    if (!customerId) return res.status(401).json({ error: 'Unauthorized' });

    const bookings = await Booking.find({ customerId })
      .sort({ createdAt: -1 })
      .populate('laborId', 'name email phone skillCategory location dailyRate');

    // FE normalizes to expose `.labor`; returning raw is okay
    return res.json({ bookings });
  } catch (err) {
    console.error('getCustomerBookings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /bookings/:id  (Customer)
 * Fetch a single booking (with labor details) — used by CardPaymentForm
 */
const getBookingById = async (req, res) => {
  try {
    const customerId = getUserId(req);
    if (!customerId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }

    const booking = await Booking.findOne({ _id: id, customerId })
      .populate('laborId', 'name email phone skillCategory location dailyRate');

    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    return res.json({ booking });
  } catch (err) {
    console.error('getBookingById error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /bookings/labor  (Labor)
 * Optional ?status=pending|accepted|rejected|cancelled
 */
const getLaborBookings = async (req, res) => {
  try {
    const laborId = getUserId(req);
    if (!laborId) return res.status(401).json({ error: 'Unauthorized' });

    const { status } = req.query;
    const filter = { laborId };
    // Default to pending if not provided (keeps your previous behavior)
    filter.status = status || 'pending';

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .populate('customerId', 'name email phone address');

    return res.json({ bookings });
  } catch (err) {
    console.error('getLaborBookings error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /bookings/:id/accept  (Labor)
 */
const acceptBooking = async (req, res) => {
  try {
    const laborId = getUserId(req);
    const { id } = req.params;

    const booking = await Booking.findOne({ _id: id, laborId });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.decision = 'accepted'; // hook syncs status=accepted, sets acceptedAt
    await booking.save();

    const labor = await Labor.findById(laborId).select('name skillCategory');
    await Notification.create({
      userId: booking.customerId,
      role: 'customer',
      type: 'booking',
      title: 'Booking Accepted',
      message: `${labor?.skillCategory || 'Labor'} ${labor?.name || ''} accepted your booking request.`,
      meta: {
        bookingId: booking._id,
        laborId,
        laborName: labor?.name,
        skillCategory: labor?.skillCategory,
        decision: booking.decision,
        status: booking.status,
      },
    });

    return res.json({ message: 'Booking accepted', booking });
  } catch (err) {
    console.error('acceptBooking error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /bookings/:id/reject  (Labor)
 */
const rejectBooking = async (req, res) => {
  try {
    const laborId = getUserId(req);
    const { id } = req.params;

    const booking = await Booking.findOne({ _id: id, laborId });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.decision = 'declined'; // hook syncs status='rejected'
    await booking.save();

    const labor = await Labor.findById(laborId).select('name skillCategory');
    await Notification.create({
      userId: booking.customerId,
      role: 'customer',
      type: 'booking',
      title: 'Booking Declined',
      message: `${labor?.skillCategory || 'Labor'} ${labor?.name || ''} declined your booking request.`,
      meta: {
        bookingId: booking._id,
        laborId,
        laborName: labor?.name,
        skillCategory: labor?.skillCategory,
        decision: booking.decision,
        status: booking.status,
      },
    });

    return res.json({ message: 'Booking rejected', booking });
  } catch (err) {
    console.error('rejectBooking error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /bookings/:id/status  (Labor) – work progress only
 * body: { workStatus: 'pending' | 'done' }
 */
const updateWorkStatus = async (req, res) => {
  try {
    const laborId = getUserId(req);
    const { id } = req.params;
    const { workStatus } = req.body;

    if (!['pending', 'done'].includes(workStatus)) {
      return res.status(400).json({ error: 'workStatus must be pending or done' });
    }

    const booking = await Booking.findOne({ _id: id, laborId });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.decision !== 'accepted') {
      return res.status(400).json({ error: 'Work status can only be updated after acceptance' });
    }

    booking.workStatus = workStatus;
    await booking.save();

    if (workStatus === 'done') {
      const labor = await Labor.findById(laborId).select('name skillCategory');
      await Notification.create({
        userId: booking.customerId,
        role: 'customer',
        type: 'booking',
        title: 'Work Completed',
        message: `${labor?.skillCategory || 'Labor'} ${labor?.name || ''} marked your job as completed.`,
        meta: {
          bookingId: booking._id,
          laborId,
          laborName: labor?.name,
          skillCategory: labor?.skillCategory,
          workStatus: booking.workStatus,
          completedAt: booking.completedAt,
        },
      });
    }

    return res.json({ message: 'Work status updated', booking });
  } catch (err) {
    console.error('updateWorkStatus error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================= PAYMENT ADDITIONS =========================

/**
 * POST /bookings/:id/payment-choice  (Customer)
 * body: { method: 'cash' | 'card' }
 * - 'cash': save paymentMethod='cash', paymentStatus='pending' or null; immediately notify labor.
 * - 'card': save paymentMethod='card', paymentStatus='pending'; actual payment completion handled in /payments/charge webhook/controller.
 */
const setPaymentChoice = async (req, res) => {
  try {
    const customerId = getUserId(req);
    if (!customerId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { method } = req.body || {};
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid booking id' });
    }
    if (!['cash', 'card'].includes(String(method || '').toLowerCase())) {
      return res.status(400).json({ error: "method must be 'cash' or 'card'" });
    }

    // Ensure the booking belongs to the caller and is accepted before choosing payment
    const booking = await Booking.findOne({ _id: id, customerId })
      .populate('laborId', 'name email phone skillCategory location dailyRate')
      .populate('customerId', 'name email phone address');

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'accepted') {
      return res.status(400).json({ error: 'You can choose payment after the labor accepts the booking' });
    }

    const chosen = method.toLowerCase();

    // Update booking payment fields
    booking.paymentMethod = chosen; // 'cash' | 'card'
    // For both cash & card, we can use 'pending' until cash is handed over / card payment completes
    booking.paymentStatus = chosen === 'card' ? 'pending' : (booking.paymentStatus || 'pending');
    await booking.save();

    // Notify labor for CASH immediately
    if (chosen === 'cash') {
      const laborId = booking.laborId?._id || booking.laborId;
      const labor = await Labor.findById(laborId).select('name skillCategory');
      // Fetch customer contact/address (already populated if schema matches)
      let customer = booking.customerId;
      if (!customer && Customer) {
        customer = await Customer.findById(customerId).select('name email phone address');
      }

      const amountText = formatCurrencyLKR(
        booking?.laborId?.dailyRate && typeof booking.laborId.dailyRate === 'number'
          ? booking.laborId.dailyRate
          : undefined
      );

      await Notification.create({
        userId: laborId,
        role: 'labor',
        type: 'payment',
        title: 'Customer will pay in cash',
        message:
          `The customer selected CASH for this job${amountText ? ` (${amountText})` : ''}.` +
          (customer?.address ? ` Location: ${customer.address}.` : ''),
        meta: {
          bookingId: booking._id,
          customerId,
          customerName: customer?.name,
          customerPhone: customer?.phone,
          customerEmail: customer?.email,
          customerAddress: customer?.address,
          paymentMethod: 'cash',
          paymentStatus: booking.paymentStatus,
          jobDate: booking?.jobDate,
          laborName: labor?.name,
          skillCategory: labor?.skillCategory,
        },
      });
    }

    return res.json({
      message: `Payment method set to ${chosen}`,
      booking,
    });
  } catch (err) {
    console.error('setPaymentChoice error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// ========================= EXPORTS =========================

module.exports = {
  createBooking,
  getCustomerBookings,
  getLaborBookings,
  acceptBooking,
  rejectBooking,
  updateWorkStatus,
  getBookingById,
  setPaymentChoice,
};
