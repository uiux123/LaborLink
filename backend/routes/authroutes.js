// routes/authroutes.js
const express = require('express');
const router = express.Router();

/* =========================
   Middleware
========================= */
const { verifyCustomer, verifyLabor, verifyAdmin } = require('../middleware/authMiddleware');

/* =========================
   Controllers (require as objects)
========================= */
const customerCtrl = require('../controllers/customerController');
const laborCtrl = require('../controllers/laborController');
const adminCtrl = require('../controllers/adminController');
const loginCtrl = require('../controllers/loginController');
const verificationCtrl = require('../controllers/verificationController');
const notificationCtrl = require('../controllers/notificationController');

/** Guard to ensure route handlers exist */
const ensureFn = (obj, key) => {
  if (!obj || typeof obj[key] !== 'function') {
    throw new Error(`Route handler "${key}" is not a function (check its export)`);
  }
  return obj[key];
};

/* =========================
   Public auth
========================= */
// Registration
router.post('/register/customer', ensureFn(customerCtrl, 'registerCustomer'));
router.post('/register/labor', ensureFn(laborCtrl, 'registerLabor'));

// Login
router.post('/login', ensureFn(loginCtrl, 'loginUser'));

// Shared OTP verify (no auth)
router.post('/verify-code', ensureFn(verificationCtrl, 'verifyCode'));

/* =========================
   Customer (protected)
========================= */
// Profile mgmt
router.put('/customers/update', verifyCustomer, ensureFn(customerCtrl, 'updateCustomer'));
router.delete('/customers/delete/:id', verifyCustomer, ensureFn(customerCtrl, 'deleteCustomer'));

// Dashboard
router.get('/customer/dashboard', verifyCustomer, ensureFn(customerCtrl, 'getDashboardData'));

// Two‑step security
// Uses req.user ({ id, role: 'customer' })
router.put('/customer/two-step', verifyCustomer, ensureFn(verificationCtrl, 'toggleTwoStepVerification'));
router.post('/send-otp', verifyCustomer, ensureFn(verificationCtrl, 'sendOTP'));

// Browse labors (customers can search/find workers)
router.get('/labors', verifyCustomer, ensureFn(laborCtrl, 'listLabors'));

/* ===== Notifications (Customer) ===== */
router.get('/notifications', verifyCustomer, ensureFn(notificationCtrl, 'getNotifications'));
router.put('/notifications/:id/read', verifyCustomer, ensureFn(notificationCtrl, 'markAsRead'));
router.put('/notifications/read-all', verifyCustomer, ensureFn(notificationCtrl, 'markAllAsRead'));

/* =========================
   Labor (protected)
========================= */
// Profile mgmt
router.put('/labors/update', verifyLabor, ensureFn(laborCtrl, 'updateLabor'));
router.delete('/labors/delete/:id', verifyLabor, ensureFn(laborCtrl, 'deleteLabor'));

// Dashboard
router.get('/labor/dashboard', verifyLabor, ensureFn(laborCtrl, 'getLaborDashboardData'));

// Two‑step security (uses req.user { id, role:'labor' })
router.put('/labor/two-step', verifyLabor, ensureFn(verificationCtrl, 'toggleTwoStepForLabor'));
router.post('/labor/send-otp', verifyLabor, ensureFn(verificationCtrl, 'sendOTPLabor'));

/* ===== Notifications (Labor) — NEW =====
   These allow the labor to receive:
   - "Customer chose cash"
   - "Card payment successful"
   - Other booking/payment updates
*/
router.get('/labor/notifications', verifyLabor, ensureFn(notificationCtrl, 'getLaborNotifications'));
router.put('/labor/notifications/:id/read', verifyLabor, ensureFn(notificationCtrl, 'markLaborAsRead'));
router.put('/labor/notifications/read-all', verifyLabor, ensureFn(notificationCtrl, 'markAllLaborAsRead'));

/* ============================================================
   NOTE:
   All BOOKING & PAYMENT endpoints are in dedicated routers:
     - /api/laborlink/bookings  -> routes/bookingRoutes.js
     - /api/laborlink/payments  -> routes/paymentRoutes.js
   Do NOT re-declare /bookings or /payments here to avoid
   route shadowing and frontend blank-page issues.
============================================================ */

module.exports = router;
