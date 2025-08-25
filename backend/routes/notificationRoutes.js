// backend/routes/bookingsRoutes.js
const express = require('express');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const auth = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * CUSTOMER creates a booking request (status: pending/requested)
 * body: { laborId, note?, jobDate? }
 */
router.post('/', auth.verifyCustomer, async (req, res) => {
  try {
    const { laborId, note, jobDate } = req.body;
    if (!laborId) return res.status(400).json({ error: 'laborId is required' });

    const booking = await Booking.create({
      customerId: req.user._id || req.user.id,
      laborId,
      note: note || '',
      jobDate: jobDate ? new Date(jobDate) : undefined,
      // decision/status/workStatus defaults via schema
    });

    return res.status(201).json({ booking });
  } catch (e) {
    console.error('POST /bookings error:', e);
    return res.status(400).json({ error: e.message });
  }
});

/**
 * CUSTOMER: list own bookings (newest first)
 * returns { bookings: [...] } with labor populated
 */
router.get('/', auth.verifyCustomer, async (req, res) => {
  try {
    const bookings = await Booking.find({
      customerId: req.user._id || req.user.id,
    })
      .sort({ createdAt: -1 })
      .populate('laborId', 'name email phone skillCategory location');

    return res.json({ bookings });
  } catch (e) {
    console.error('GET /bookings error:', e);
    return res.status(400).json({ error: e.message });
  }
});

/**
 * LABOR: list bookings (optional ?status=pending|accepted|rejected|cancelled)
 * returns { bookings: [...] } with customer populated
 */
router.get('/labor', auth.verifyLabor, async (req, res) => {
  try {
    const { status } = req.query;
    const query = { laborId: req.user._id || req.user.id };
    if (status) query.status = status; // pending|accepted|rejected|cancelled

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .populate('customerId', 'name email phone address');

    return res.json({ bookings });
  } catch (e) {
    console.error('GET /bookings/labor error:', e);
    return res.status(400).json({ error: e.message });
  }
});

/**
 * LABOR updates booking status (accept/reject)
 * body: { status: 'accepted' | 'rejected' }
 * Creates a notification to the CUSTOMER on accept/reject
 */
router.put('/:bookingId/status', auth.verifyLabor, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      laborId: req.user._id || req.user.id,
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    // status <-> decision sync is handled by the Booking schema hooks
    booking.status = status;
    await booking.save();

    // Notify customer
    const title = status === 'accepted' ? 'Booking Accepted' : 'Booking Rejected';
    const message =
      status === 'accepted'
        ? 'Your booking request has been accepted.'
        : 'Your booking request has been rejected.';

    await Notification.create({
      userId: booking.customerId,
      role: 'customer',
      type: 'booking',
      title,
      message,
      meta: {
        bookingId: booking._id,
        laborId: booking.laborId,
        status: booking.status,
      },
    });

    return res.json({ booking });
  } catch (e) {
    console.error('PUT /bookings/:bookingId/status error:', e);
    return res.status(400).json({ error: e.message });
  }
});

module.exports = router;
