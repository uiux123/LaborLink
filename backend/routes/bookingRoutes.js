const express = require('express');
const auth = require('../middleware/authMiddleware');
const {
  createBooking,
  getCustomerBookings,
  getLaborBookings,
  acceptBooking,
  rejectBooking,
  updateWorkStatus,
  // NEW handlers (implemented in bookingController.js)
  getBookingById,        // GET /bookings/:id   (customer scope)
  setPaymentChoice,      // POST /bookings/:id/payment-choice
} = require('../controllers/bookingController');

const router = express.Router();

/**
 * CUSTOMER creates a booking request (status: pending / decision: requested)
 * POST /bookings
 */
router.post('/', auth.verifyCustomer, createBooking);

/**
 * CUSTOMER lists own bookings
 * GET /bookings
 */
router.get('/', auth.verifyCustomer, getCustomerBookings);

/**
 * LABOR lists their bookings (optional ?status=pending|accepted|rejected|cancelled)
 * Support BOTH paths to avoid FE/BE mismatch:
 *   - GET /bookings/labor
 *   - GET /bookings/labor/bookings
 * These MUST appear before any "/:id/..." routes.
 */
router.get('/labor', auth.verifyLabor, getLaborBookings);
router.get('/labor/bookings', auth.verifyLabor, getLaborBookings);

/**
 * NEW: CUSTOMER fetches a single booking (used by CardPaymentForm to show summary)
 * GET /bookings/:id
 */
router.get('/:id', auth.verifyCustomer, getBookingById);

/**
 * NEW: CUSTOMER selects payment option for a booking
 * body: { method: 'cash' | 'card' }
 * POST /bookings/:id/payment-choice
 */
router.post('/:id/payment-choice', auth.verifyCustomer, setPaymentChoice);

/**
 * Legacy convenience (still OK to keep)
 * PUT /bookings/:id/accept
 * PUT /bookings/:id/reject
 */
router.put('/:id/accept', auth.verifyLabor, acceptBooking);
router.put('/:id/reject', auth.verifyLabor, rejectBooking);

/**
 * Unified status endpoint
 * PUT /bookings/:id/status
 * - { status: 'accepted'|'rejected' } handled by legacy controllers above
 * - { workStatus: 'pending'|'done' } updates post‑accept work progress
 */
router.put('/:id/status', auth.verifyLabor, async (req, res, next) => {
  try {
    const { status, workStatus } = (req.body || {});

    if (typeof status === 'string') {
      const s = status.toLowerCase();
      if (s === 'accepted') return acceptBooking(req, res, next);
      if (s === 'rejected') return rejectBooking(req, res, next);
      return res.status(400).json({ error: 'Invalid status. Use accepted or rejected.' });
    }

    if (typeof workStatus === 'string') {
      const w = workStatus.toLowerCase();
      if (w === 'pending' || w === 'done') return updateWorkStatus(req, res, next);
      return res.status(400).json({ error: 'Invalid workStatus. Use pending or done.' });
    }

    return res.status(400).json({ error: 'Provide either { status } or { workStatus } in body.' });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
