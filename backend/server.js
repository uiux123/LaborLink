// server.js
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Routers
const authRoutes = require('./routes/authroutes');          // consolidated routes you already had
const bookingRoutes = require('./routes/bookingRoutes');    // ✅ new: bookings (incl. payment-choice & get-by-id)
const paymentRoutes = require('./routes/paymentRoutes');    // ✅ new: payments (start/charge)

const app = express();

/* -------------------------------------------
   Core middleware
-------------------------------------------- */
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*', // e.g. "http://localhost:5173,http://localhost:3000"
  credentials: true,
}));
app.use(express.json({ limit: '1mb' })); // adjust if you need larger payloads

// Simple request logger
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

/* -------------------------------------------
   Health check
-------------------------------------------- */
app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

/* -------------------------------------------
   API routes
-------------------------------------------- */
// Your existing consolidated router (auth, dashboards, customers, labors, notifications, etc.)
app.use('/api/laborlink', authRoutes);

// New: bookings endpoints (create, list, accept/reject, status, payment-choice, get-by-id)
app.use('/api/laborlink/bookings', bookingRoutes);

// New: payments endpoints (start session / charge)
app.use('/api/laborlink/payments', paymentRoutes);

/* -------------------------------------------
   404 handler (for unknown API routes)
-------------------------------------------- */
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  return next();
});

/* -------------------------------------------
   Error handler
-------------------------------------------- */
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

/* -------------------------------------------
   DB connection & server start
-------------------------------------------- */
const PORT = Number(process.env.PORT) || 2000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Missing MONGO_URI in environment.');
  process.exit(1);
}

mongoose.set('strictQuery', true);

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`🚀 API listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Mongo connection error:', error);
    process.exit(1);
  }
})();
