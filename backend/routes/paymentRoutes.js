// backend/routes/paymentRoutes.js
const express = require('express');
const auth = require('../middleware/authMiddleware');
const {
  startCardPaymentSession,
  processCardPayment,
} = require('../controllers/paymentController');

const router = express.Router();

/**
 * Start a card payment session.
 * If you integrate an external PSP, return { url } to redirect the user.
 * Otherwise return 200 with no url so the FE uses the in‑app form.
 */
router.post('/start', auth.verifyCustomer, startCardPaymentSession);

/**
 * Charge a card using the in‑app form (mock / provider-backed).
 * Body: { bookingId, amount, card: { holder, number, expMonth, expYear, cvc } }
 * On success: marks booking.paymentMethod='card', paymentStatus='paid', notifies labor.
 */
router.post('/charge', auth.verifyCustomer, processCardPayment);

module.exports = router;
