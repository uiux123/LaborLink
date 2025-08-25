// src/services/api.js
import axios from "axios";

/* -------------------------------------------
   BASE URL + HELPERS
-------------------------------------------- */
export const BASE_URL =
  import.meta?.env?.VITE_API_BASE_URL || "http://localhost:2000/api/laborlink";

const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
});

// Returns "" or "?k=v&k2=v2"
const buildQuery = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return "";
  const qs = entries
    .map(([k, v]) =>
      `${encodeURIComponent(k)}=${encodeURIComponent(
        Array.isArray(v) ? v.join(",") : v
      )}`
    )
    .join("&");
  return `?${qs}`;
};

/* -------------------------------------------
   AUTH (PUBLIC)
-------------------------------------------- */
export const registerCustomer = async (data) =>
  axios.post(`${BASE_URL}/register/customer`, data);

export const registerLabor = async (data) =>
  axios.post(`${BASE_URL}/register/labor`, data);

export const loginUser = async (credentials) =>
  axios.post(`${BASE_URL}/login`, credentials);

export const verifyCode = async (data) =>
  axios.post(`${BASE_URL}/verify-code`, data);

/* -------------------------------------------
   DASHBOARDS (PROTECTED)
-------------------------------------------- */
export const getCustomerDashboard = async () =>
  axios.get(`${BASE_URL}/customer/dashboard`, { headers: authHeader() });

export const getLaborDashboard = async () =>
  axios.get(`${BASE_URL}/labor/dashboard`, { headers: authHeader() });

export const getAdminDashboard = async () =>
  axios.get(`${BASE_URL}/admin/dashboard`, { headers: authHeader() });

/* -------------------------------------------
   CUSTOMERS (PROTECTED)
-------------------------------------------- */
export const updateCustomer = async (data) =>
  axios.put(`${BASE_URL}/customers/update`, data, { headers: authHeader() });

export const deleteCustomer = async (customerId) =>
  axios.delete(`${BASE_URL}/customers/delete/${customerId}`, {
    headers: authHeader(),
  });

/* ---- Customer 2-Step ---- */
export const customerToggleTwoStep = async (enable) =>
  axios.put(
    `${BASE_URL}/customer/two-step`,
    { enable },
    { headers: authHeader() }
  );

export const customerSendOtp = async () =>
  axios.post(`${BASE_URL}/send-otp`, {}, { headers: authHeader() });

/* ---- Backward-compat wrappers ---- */
export const sendOTP = async (_customerId) => customerSendOtp();
export const toggleTwoStepVerification = async (_customerId, enable) =>
  customerToggleTwoStep(enable);

/* -------------------------------------------
   LABORS (PROTECTED)
-------------------------------------------- */
export const updateLabor = async (data) =>
  axios.put(`${BASE_URL}/labors/update`, data, { headers: authHeader() });

export const deleteLabor = async (laborId) =>
  axios.delete(`${BASE_URL}/labors/delete/${laborId}`, {
    headers: authHeader(),
  });

/* ---- Labor 2-Step ---- */
export const laborToggleTwoStep = async (enable) =>
  axios.put(`${BASE_URL}/labor/two-step`, { enable }, { headers: authHeader() });

export const laborSendOtp = async () =>
  axios.post(`${BASE_URL}/labor/send-otp`, {}, { headers: authHeader() });

/* ---- Backward-compat wrappers ---- */
export const sendOTPLabor = async (_laborId) => laborSendOtp();
export const toggleTwoStepForLabor = async (_laborId, enable) =>
  laborToggleTwoStep(enable);

/* ---- Browse Labors ---- */
export const getLabors = async (params = {}) => {
  const query = buildQuery(params);
  return axios.get(`${BASE_URL}/labors${query}`, { headers: authHeader() });
};

/* -------------------------------------------
   BOOKINGS
-------------------------------------------- */
// Customer creates a booking
export const createBooking = async ({ laborId, note, jobDate }) =>
  axios.post(
    `${BASE_URL}/bookings`,
    { laborId, note, jobDate },
    { headers: authHeader() }
  );

// Customer lists own bookings
export const getCustomerBookings = async () =>
  axios.get(`${BASE_URL}/bookings`, { headers: authHeader() });

// Customer fetches a single booking (for payment summary)
export const getBookingById = async (bookingId) =>
  axios.get(`${BASE_URL}/bookings/${bookingId}`, { headers: authHeader() });

// Customer sets payment choice: { method: 'cash' | 'card' }
export const setBookingPaymentChoice = async ({ bookingId, method }) =>
  axios.post(
    `${BASE_URL}/bookings/${bookingId}/payment-choice`,
    { method },
    { headers: authHeader() }
  );

// Labor lists their bookings (optional filter: { status })
export const getLaborBookings = async (params = {}) => {
  const query = buildQuery(params);
  const headers = { headers: authHeader() };
  try {
    return await axios.get(`${BASE_URL}/bookings/labor${query}`, headers);
  } catch (err) {
    const code = err?.response?.status;
    if (code === 404 || code === 405) {
      return await axios.get(`${BASE_URL}/labor/bookings${query}`, headers);
    }
    throw err;
  }
};

// Legacy convenience
export const acceptBooking = async (bookingId) =>
  axios.put(`${BASE_URL}/bookings/${bookingId}/accept`, {}, { headers: authHeader() });

export const rejectBooking = async (bookingId) =>
  axios.put(`${BASE_URL}/bookings/${bookingId}/reject`, {}, { headers: authHeader() });

// Unified status endpoint
export const setBookingStatus = async (bookingId, status) =>
  axios.put(
    `${BASE_URL}/bookings/${bookingId}/status`,
    { status },
    { headers: authHeader() }
  );

export const updateWorkStatus = async (bookingId, workStatus) =>
  axios.put(
    `${BASE_URL}/bookings/${bookingId}/status`,
    { workStatus },
    { headers: authHeader() }
  );

/* -------------------------------------------
   PAYMENTS
-------------------------------------------- */
// Start external session (if integrated with Stripe/PayHere)
export const startCardPaymentSession = async ({ bookingId }) =>
  axios.post(`${BASE_URL}/payments/start`, { bookingId }, { headers: authHeader() });

// Process an in-app card payment (CardPaymentForm.jsx)
export const processCardPayment = async (payload) =>
  axios.post(`${BASE_URL}/payments/charge`, payload, { headers: authHeader() });

/* -------------------------------------------
   NOTIFICATIONS
-------------------------------------------- */
// CUSTOMER
export const getCustomerNotifications = async ({ unread = false } = {}) => {
  const query = buildQuery({ unread });
  return axios.get(`${BASE_URL}/notifications${query}`, { headers: authHeader() });
};

export const markNotificationRead = async (notificationId) =>
  axios.put(
    `${BASE_URL}/notifications/${notificationId}/read`,
    {},
    { headers: authHeader() }
  );

export const markAllNotificationsRead = async () =>
  axios.put(`${BASE_URL}/notifications/read-all`, {}, { headers: authHeader() });

// LABOR (NEW)
export const getLaborNotifications = async ({ unread = false } = {}) => {
  const query = buildQuery({ unread });
  return axios.get(`${BASE_URL}/labor/notifications${query}`, { headers: authHeader() });
};

export const markLaborNotificationRead = async (notificationId) =>
  axios.put(
    `${BASE_URL}/labor/notifications/${notificationId}/read`,
    {},
    { headers: authHeader() }
  );

export const markAllLaborNotificationsRead = async () =>
  axios.put(`${BASE_URL}/labor/notifications/read-all`, {}, { headers: authHeader() });
