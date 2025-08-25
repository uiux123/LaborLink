import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import './CardPaymentForm.css';

import Swal from 'sweetalert2';
import {
  // You will add these to your services/api (snippets below)
  processCardPayment,
  getBookingById,
} from '../../services/api';

// Optional: reuse your dashboard styles (so it looks native).
// If your path differs, adjust this import or remove it.



const currencyFormat = (n) =>
  typeof n === 'number' ? `Rs. ${n.toLocaleString()}` : '—';

const CardPaymentForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Prefer state passed from navigate('/payments/card', { state: {...} })
  const navState = location?.state || {};
  const stateBookingId = navState.bookingId || null;

  // Also support ?bookingId=... as a fallback
  const queryBookingId = searchParams.get('bookingId') || null;

  const bookingId = stateBookingId || queryBookingId;

  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(null);

  // Pre-fill summary from state if available
  const [amount, setAmount] = useState(
    typeof navState.amount === 'number' ? navState.amount : null
  );
  const [laborName, setLaborName] = useState(navState.laborName || '');
  const [customerAddress, setCustomerAddress] = useState(navState.customerAddress || '');

  // Basic card form state (this is a simple in‑app form; your backend should handle real processing)
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');

  const summary = useMemo(() => {
    const a = amount ?? (typeof booking?.labor?.dailyRate === 'number' ? booking.labor.dailyRate : null);
    const ln = laborName || booking?.labor?.name || '';
    const addr = customerAddress || booking?.customerAddress || '';
    return { amount: a, laborName: ln, customerAddress: addr };
  }, [amount, laborName, customerAddress, booking]);

  // If state didn’t include details, try fetching booking
  useEffect(() => {
    if (!bookingId) return;
    let mounted = true;

    (async () => {
      try {
        const resp = await getBookingById(bookingId);
        const b = resp?.data?.booking || resp?.data || null;
        if (!mounted) return;
        setBooking(b);

        // Fill any missing bits from API
        if (b?.labor?.name && !laborName) setLaborName(b.labor.name);
        if (typeof b?.labor?.dailyRate === 'number' && amount == null) setAmount(b.labor.dailyRate);
        if (b?.customerAddress && !customerAddress) setCustomerAddress(b.customerAddress);
      } catch (err) {
        console.error('Failed to load booking', err);
        Swal.fire('Error', 'Could not load booking details.', 'error');
      }
    })();

    return () => { mounted = false; };
  }, [bookingId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Basic client-side checks
    if (!bookingId) {
      Swal.fire('Missing booking', 'Booking is not specified.', 'info');
      return;
    }
    if (!cardholderName || !cardNumber || !expMonth || !expYear || !cvc) {
      Swal.fire('Required', 'Please complete all card fields.', 'info');
      return;
    }
    if (!/^\d{13,19}$/.test(cardNumber.replace(/\s+/g, ''))) {
      Swal.fire('Invalid card', 'Please enter a valid card number.', 'warning');
      return;
    }
    if (!/^\d{2}$/.test(expMonth) || Number(expMonth) < 1 || Number(expMonth) > 12) {
      Swal.fire('Invalid month', 'Expiry month must be 01–12.', 'warning');
      return;
    }
    if (!/^\d{2,4}$/.test(expYear)) {
      Swal.fire('Invalid year', 'Expiry year must be 2 or 4 digits.', 'warning');
      return;
    }
    if (!/^\d{3,4}$/.test(cvc)) {
      Swal.fire('Invalid CVC', 'CVC must be 3–4 digits.', 'warning');
      return;
    }

    // Confirm intent
    const confirm = await Swal.fire({
      title: 'Confirm payment',
      html: `
        <div style="text-align:left">
          <div><b>Booking:</b> ${bookingId}</div>
          <div><b>Labor:</b> ${summary.laborName || '—'}</div>
          <div><b>Amount:</b> ${currencyFormat(summary.amount)}</div>
          <div><b>Address:</b> ${summary.customerAddress || '—'}</div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Pay now',
    });
    if (!confirm.isConfirmed) return;

    try {
      setLoading(true);
      // Call backend to process charge; on success, backend should:
      // - mark booking.paymentMethod = 'card'
      // - mark booking.paymentStatus = 'paid'
      // - notify labor with customer details + location
      const resp = await processCardPayment({
        bookingId,
        amount: summary.amount,
        card: {
          holder: cardholderName,
          number: cardNumber.replace(/\s+/g, ''),
          expMonth,
          expYear,
          cvc,
        },
      });

      if (resp?.status === 200) {
        await Swal.fire('Payment successful', 'We have notified the labor with your details.', 'success');
        // Go back to dashboard Bookings tab. Adjust the path below to match your route.
        navigate('/customer/dashboard', { replace: true, state: { tab: 'bookings' } });
        return;
      }

      throw new Error(resp?.data?.error || 'Unknown payment error');
    } catch (err) {
      console.error(err);
      Swal.fire('Payment failed', err?.response?.data?.error || err.message || 'Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    // Prefer returning to dashboard bookings
    navigate('/customer/dashboard', { replace: true, state: { tab: 'bookings' } });
  };

  return (
    <div className="cusdash-main-content" style={{ maxWidth: 820, margin: '24px auto' }}>
      <div className="cusdash-profile-section-card">
        <h3>Card Payment</h3>

        <div className="cusdash-field-row" style={{ marginTop: 6 }}>
          <span className="cusdash-field-label">Booking ID</span>
          <span className="cusdash-field-value">{bookingId || '—'}</span>
        </div>
        <div className="cusdash-field-row">
          <span className="cusdash-field-label">Labor</span>
          <span className="cusdash-field-value">{summary.laborName || '—'}</span>
        </div>
        <div className="cusdash-field-row">
          <span className="cusdash-field-label">Amount</span>
          <span className="cusdash-field-value">{currencyFormat(summary.amount)}</span>
        </div>
        <div className="cusdash-field-row">
          <span className="cusdash-field-label">Location</span>
          <span className="cusdash-field-value">{summary.customerAddress || '—'}</span>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #2a3055', margin: '14px 0' }} />

        <form className="cusdash-form" onSubmit={handleSubmit}>
          <div className="cusdash-form-row">
            <label>Cardholder Name</label>
            <input
              type="text"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              placeholder="As printed on card"
              required
            />
          </div>

          <div className="cusdash-form-row">
            <label>Card Number</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              maxLength={23}
              required
            />
          </div>

          <div className="cusdash-filter-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="cusdash-form-row">
              <label>Exp. Month</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="MM"
                value={expMonth}
                onChange={(e) => setExpMonth(e.target.value)}
                maxLength={2}
                required
              />
            </div>
            <div className="cusdash-form-row">
              <label>Exp. Year</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="YY or YYYY"
                value={expYear}
                onChange={(e) => setExpYear(e.target.value)}
                maxLength={4}
                required
              />
            </div>
            <div className="cusdash-form-row">
              <label>CVC</label>
              <input
                type="password"
                inputMode="numeric"
                placeholder="3–4 digits"
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                maxLength={4}
                required
              />
            </div>
          </div>

          <div className="cusdash-form-actions" style={{ display: 'flex', gap: 10 }}>
            <button
              className="cusdash-btn cusdash-btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading ? 'Processing…' : `Pay ${currencyFormat(summary.amount)}`}
            </button>
            <button
              className="cusdash-btn"
              type="button"
              onClick={goBack}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      <p className="muted" style={{ marginTop: 10 }}>
        By paying, you authorize us to charge your card for the amount shown. Your labor will be
        notified with your contact details and location once payment is confirmed.
      </p>
    </div>
  );
};

export default CardPaymentForm;
