

import React, { useEffect, useMemo, useState } from 'react';
import {

  
  getCustomerDashboard,
  updateCustomer,
  deleteCustomer,
  toggleTwoStepVerification,
  sendOTP,
  verifyCode,
  getLabors,
  createBooking,
  getCustomerBookings, // ✅ use bookings list instead of a bell
  // ⬇️ NEW: add these in services/api
  startCardPaymentSession,
  setBookingPaymentChoice,
} from '../../services/api';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './CustomerDashboard.css';
import {
  FaUser,
  FaCalendarCheck,
  FaRegCreditCard,
  FaSignOutAlt,
  FaChartLine,
  FaEdit,
  FaLock,
  FaHistory,
  FaTrashAlt,
  FaSave,
  FaUsers,
  FaFilter,
  FaSearch,
  FaArrowLeft,
  FaArrowRight,
} from 'react-icons/fa';

const coalesceCustomer = (payload) => {
  return (
    payload?.customer ||
    payload?.updatedCustomer ||
    payload?.data ||
    payload ||
    {}
  );
};

// Enumerations (mirror your schema)
const SKILL_CATEGORIES = [
  'Masons',
  'Electricians',
  'Plumbers',
  'Painters',
  'Carpenters',
  'Tile Layers',
  'Welders',
  'Roofers',
  'Helpers/General Labourers',
  'Scaffolders',
];

const AGE_CATEGORIES = [
  'Young Adults',
  'Adults',
  'Middle-aged Workers',
  'Senior Workers',
];

// Optional: Sri Lanka common districts
const LK_DISTRICTS = [
  'Colombo','Gampaha','Kalutara','Kandy','Matale','Nuwara Eliya','Galle','Matara','Hambantota',
  'Jaffna','Kilinochchi','Mannar','Vavuniya','Mullaitivu','Batticaloa','Ampara','Trincomalee',
  'Kurunegala','Puttalam','Anuradhapura','Polonnaruwa','Badulla','Monaragala','Ratnapura','Kegalle'
];

const FIXED_PAGE_SIZE = 12; // fixed page size for labour listing

const CustomerDashboard = () => {
  const navigate = useNavigate();

  const [customerData, setCustomerData] = useState(null);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState('profile');
  const [profileTab, setProfileTab] = useState('overview');

  // 2FA
  const [twoStepEnabled, setTwoStepEnabled] = useState(false);
  const [loadingTwoStep, setLoadingTwoStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // ---- Bookings (replaces bell/notifications) ----
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState('');

  // ---- Labour browse/filter state ----
  const [labors, setLabors] = useState([]);
  const [laborLoading, setLaborLoading] = useState(false);
  const [laborError, setLaborError] = useState('');

  const [filters, setFilters] = useState({
    location: '',
    skillCategory: '',
    ageCategory: '',
    search: '',
    sort: 'recent',
    page: 1,
  });

  const [laborMeta, setLaborMeta] = useState({
    page: 1,
    pageSize: FIXED_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    []
  );

  // Load customer dashboard
  useEffect(() => {
    (async () => {
      try {
        const resp = await getCustomerDashboard();
        const c = coalesceCustomer(resp?.data);
        setCustomerData(c);
        setFormData({
          name: c.name || '',
          email: c.email || '',
          phone: c.phone || '',
          address: c.address || '',
        });
        setTwoStepEnabled(Boolean(c.twoStepEnabled));
      } catch (err) {
        console.error('Failed to fetch dashboard:', err);
        navigate('/login');
      }
    })();
  }, [navigate]);

  // helper so we can refresh on demand
  const fetchBookings = async () => {
    try {
      setBookingsLoading(true);
      setBookingsError('');

      // ✅ backend returns { bookings: [...] }
      const resp = await getCustomerBookings();
      const raw = Array.isArray(resp?.data?.bookings) ? resp.data.bookings : [];

      // ✅ normalize to expose `labor` alongside populated `laborId`
      const normalized = raw.map((b) => ({
        ...b,
        labor: b?.labor ?? (typeof b?.laborId === 'object' ? b.laborId : undefined),
      }));

      setBookings(normalized);
    } catch (e) {
      console.error('Failed to load bookings:', e);
      setBookingsError('Failed to load your bookings.');
    } finally {
      setBookingsLoading(false);
    }
  };

  // Fetch bookings when Bookings tab is active (and poll lightly)
  useEffect(() => {
    if (activeTab !== 'bookings') return;
    fetchBookings();
    const timer = setInterval(fetchBookings, 15000);
    return () => clearInterval(timer);
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/');
  };

  // Edit profile
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const resp = await updateCustomer(formData);
      const updated = coalesceCustomer(resp?.data);
      setCustomerData(updated);
      setFormData({
        name: updated.name || '',
        email: updated.email || '',
        phone: updated.phone || '',
        address: updated.address || '',
      });
      Swal.fire('Success', 'Details updated successfully!', 'success');
    } catch (err) {
      console.error('Update failed:', err);
      Swal.fire('Failed', 'Failed to update details', 'error');
    }
  };

  // Delete account
  const handleDelete = async () => {
    const confirm = await Swal.fire({
      title: 'Delete Account?',
      text: 'This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
    });
    if (!confirm.isConfirmed) return;

    try {
      await deleteCustomer(customerData._id);
      await Swal.fire('Deleted', 'Account deleted successfully', 'success');
      handleLogout();
    } catch (err) {
      console.error('Delete failed:', err);
      Swal.fire('Error', 'Failed to delete account', 'error');
    }
  };

  // 2-Step Verification flow
  const handleToggleTwoStep = async () => {
    try {
      setLoadingTwoStep(true);

      if (!twoStepEnabled) {
        // Request an OTP first
        const otpResp = await sendOTP(customerData._id);
        if (otpResp?.status === 200) {
          setOtp('');
          setOtpSent(true);
          Swal.fire('OTP Sent', 'Please check your email for the OTP.', 'success');
        } else {
          Swal.fire('Error', 'Could not send OTP. Try again.', 'error');
        }
      } else {
        // Disable immediately
        const resp = await toggleTwoStepVerification(customerData._id, false);
        const enabled = Boolean(resp?.data?.twoStepEnabled);
        setTwoStepEnabled(enabled);
        setOtpSent(false);
        setOtp('');
        Swal.fire('Success', resp?.data?.message || 'Two-step disabled', 'success');
      }
    } catch (err) {
      console.error('Failed to toggle 2-step:', err);
      Swal.fire('Error', 'Could not update 2-step verification', 'error');
    } finally {
      setLoadingTwoStep(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      Swal.fire('Required', 'Please enter the OTP.', 'info');
      return;
    }
    try {
      setVerifyingOtp(true);

      // 1) Verify OTP for the email
      const verifyResp = await verifyCode({ email: customerData.email, code: otp });
      if (verifyResp?.status !== 200) {
        Swal.fire('Error', 'Invalid or expired OTP', 'error');
        return;
      }

      // 2) Enable two-step on server
      const enableResp = await toggleTwoStepVerification(customerData._id, true);
      const enabled = Boolean(enableResp?.data?.twoStepEnabled);
      setTwoStepEnabled(enabled);
      setOtpSent(false);
      setOtp('');
      Swal.fire('Success', 'Two-step verification enabled.', 'success');
    } catch (err) {
      console.error('OTP verification failed:', err);
      Swal.fire('Error', 'Failed to verify OTP', 'error');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // ---- Fetch labors when the tab is active or filters change ----
  useEffect(() => {
    if (activeTab !== 'labors') return;

    const fetchLabors = async () => {
      try {
        setLaborLoading(true);
        setLaborError('');

        const { location, skillCategory, ageCategory, search, sort, page } = filters;

        const resp = await getLabors({
          location,
          skillCategory,
          ageCategory,
          search,
          sort,
          page,
          pageSize: FIXED_PAGE_SIZE,
        });

        const payload = resp?.data || {};
        setLabors(Array.isArray(payload.data) ? payload.data : []);
        setLaborMeta({
          page: payload.page || page,
          pageSize: payload.pageSize || FIXED_PAGE_SIZE,
          total: payload.total || 0,
          totalPages: payload.totalPages || 1,
        });
      } catch (err) {
        console.error('Failed to fetch labors:', err);
        setLaborError('Failed to load labour list.');
      } finally {
        setLaborLoading(false);
      }
    };

    fetchLabors();
  }, [activeTab, filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      page: 1,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      location: '',
      skillCategory: '',
      ageCategory: '',
      search: '',
      sort: 'recent',
      page: 1,
    });
  };

  const goPage = (next) => {
    setFilters((prev) => {
      const target = Math.max(1, Math.min(prev.page + next, laborMeta.totalPages || 1));
      return { ...prev, page: target };
    });
  };

  const lastLoginDisplay = customerData?.lastLogin
    ? new Date(customerData.lastLogin).toLocaleString()
    : 'N/A';

  // ---- Booking helpers: compose a descriptive message ----
  const formatBookingMessage = (bk) => {
    const laborName = bk?.labor?.name || bk?.meta?.laborName || 'the labor';
    const skill = bk?.labor?.skillCategory || bk?.meta?.skillCategory || '';
    const skillPrefix = skill ? `${skill.slice(0, -1) || skill} ` : ''; // e.g., "Mason "
    const jobDate =
      bk?.jobDate ? ` for ${new Date(bk.jobDate).toLocaleDateString()}` : '';

    switch (bk?.status) {
      case 'accepted':
        return `${skillPrefix}${laborName} accepted your request${jobDate}.`;
      case 'rejected':
        return `${skillPrefix}${laborName} rejected your request${jobDate}.`;
      case 'cancelled':
        return `Your booking${jobDate} was cancelled.`;
      default:
        return `Waiting for ${skillPrefix}${laborName} to respond${jobDate}…`;
    }
  };

  const pillClassForStatus = (status) => {
    switch (status) {
      case 'accepted': return 'pill accepted';
      case 'rejected': return 'pill rejected';
      case 'cancelled': return 'pill cancelled';
      default: return 'pill pending';
    }
  };

  // ⬇️ Proceed to Payment flow
  const handleProceedPayment = async (bk) => {
    try {
      const dailyRate =
        typeof bk?.labor?.dailyRate === 'number' ? bk.labor.dailyRate : undefined;

      const result = await Swal.fire({
        title: 'Choose payment method',
        html: dailyRate
          ? `Amount (Daily Rate): <b>Rs. ${dailyRate.toLocaleString()}</b>`
          : 'Select how you want to pay.',
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: 'Pay by Card',
        denyButtonText: 'Pay in Cash',
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        focusConfirm: false,
      });

      // Cash path
      if (result.isDenied) {
        try {
          await setBookingPaymentChoice({ bookingId: bk._id, method: 'cash' });
          await Swal.fire(
            'Cash selected',
            'We notified the labor that you will pay in cash at the location.',
            'success'
          );
          fetchBookings();
        } catch (err) {
          console.error(err);
          Swal.fire(
            'Error',
            err?.response?.data?.error || 'Could not set payment to cash.',
            'error'
          );
        }
        return;
      }

      // Card path
      if (result.isConfirmed) {
        try {
          const res = await startCardPaymentSession({ bookingId: bk._id });
          const url = res?.data?.url;
          if (url) {
            window.location.href = url; // e.g., Stripe Checkout URL
          } else {
            // Fallback to internal payment page
            navigate('/payments/card', {
              state: {
                bookingId: bk._id,
                laborName: bk?.labor?.name || '',
                amount: dailyRate || 0,
                customerAddress: customerData?.address || '',
              },
            });
          }
        } catch (err) {
          console.error(err);
          Swal.fire(
            'Error',
            err?.response?.data?.error || 'Could not start card payment.',
            'error'
          );
        }
      }
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'Something went wrong. Please try again.', 'error');
    }
  };

  const renderPaymentBadges = (bk) => {
    const pm = bk?.paymentMethod;
    const ps = bk?.paymentStatus;
    return (
      <div className="cusdash-payment-badges">
        {pm && <span className={`pill ${pm === 'card' ? 'card' : 'cash'}`}>{pm}</span>}
        {ps && <span className={`pill ${ps === 'paid' ? 'accepted' : 'pending'}`}>{ps}</span>}
      </div>
    );
  };

  return (
    <div className="cusdash-container">
      {/* Sidebar */}
      <aside className="cusdash-sidebar">
        <h2 className="cusdash-sidebar-title">Customer Panel</h2>
        <ul className="cusdash-sidebar-nav">
          <li
            className={`cusdash-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FaUser /> Profile
          </li>
          <li
            className={`cusdash-nav-item ${activeTab === 'labors' ? 'active' : ''}`}
            onClick={() => setActiveTab('labors')}
          >
            <FaUsers /> Find Labour
          </li>
          <li
            className={`cusdash-nav-item ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            <FaCalendarCheck /> Bookings
          </li>
          <li
            className={`cusdash-nav-item ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            <FaRegCreditCard /> Subscriptions
          </li>
          <li className="cusdash-nav-item cusdash-logout" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </li>
        </ul>
      </aside>

      {/* Main */}
      <main className="cusdash-main-content">
        {/* Header */}
        <div className="cusdash-header">
          <div>
            <h1>Welcome back, {customerData?.name || 'Customer'}</h1>
            <p className="cusdash-subtitle">Here’s what’s happening on your account today.</p>
          </div>
          <div className="cusdash-date">{today}</div>
        </div>

        {/* Stats */}
        {activeTab !== 'labors' && (
          <div className="cusdash-stats">
            <div className="cusdash-stat-card">
              <div className="cusdash-stat-top">
                <FaCalendarCheck className="cusdash-stat-icon" />
                <span className="cusdash-stat-title">Bookings</span>
              </div>
              <div className="cusdash-stat-value">{customerData?.bookings?.length || 0}</div>
            </div>
            <div className="cusdash-stat-card">
              <div className="cusdash-stat-top">
                <FaRegCreditCard className="cusdash-stat-icon" />
                <span className="cusdash-stat-title">Subscriptions</span>
              </div>
              <div className="cusdash-stat-value">{customerData?.subscriptions?.length || 0}</div>
            </div>
            <div className="cusdash-stat-card">
              <div className="cusdash-stat-top">
                <FaChartLine className="cusdash-stat-icon" />
                <span className="cusdash-stat-title">Last Login</span>
              </div>
              <div className="cusdash-stat-value">{lastLoginDisplay}</div>
            </div>
          </div>
        )}

        {/* -------------------- PROFILE TABS -------------------- */}
        {activeTab === 'profile' && (
          <>
            {/* Tabs */}
            <div className="cusdash-profile-tabs">
              <button
                className={`cusdash-profile-tab ${profileTab === 'overview' ? 'active' : ''}`}
                onClick={() => setProfileTab('overview')}
              >
                <FaUser /> Overview
              </button>
              <button
                className={`cusdash-profile-tab ${profileTab === 'edit' ? 'active' : ''}`}
                onClick={() => setProfileTab('edit')}
              >
                <FaEdit /> Edit Profile
              </button>
              <button
                className={`cusdash-profile-tab ${profileTab === 'security' ? 'active' : ''}`}
                onClick={() => setProfileTab('security')}
              >
                <FaLock /> Security
              </button>
              <button
                className={`cusdash-profile-tab ${profileTab === 'activity' ? 'active' : ''}`}
                onClick={() => setProfileTab('activity')}
              >
                <FaHistory /> Activity Log
              </button>
            </div>

            {/* Overview */}
            {profileTab === 'overview' && (
              <div className="cusdash-dashboard-grid cusdash-dashboard-two">
                <div className="cusdash-profile-section-card">
                  <h3>Profile Overview</h3>
                  <div className="cusdash-field-row">
                    <span className="cusdash-field-label">Name</span>
                    <span className="cusdash-field-value">{customerData?.name || '-'}</span>
                  </div>
                  <div className="cusdash-field-row">
                    <span className="cusdash-field-label">Email</span>
                    <span className="cusdash-field-value">{customerData?.email || '-'}</span>
                  </div>
                  <div className="cusdash-field-row">
                    <span className="cusdash-field-label">Phone</span>
                    <span className="cusdash-field-value">{customerData?.phone || '-'}</span>
                  </div>
                  <div className="cusdash-field-row">
                    <span className="cusdash-field-label">Address</span>
                    <span className="cusdash-field-value">{customerData?.address || '-'}</span>
                  </div>
                  <div className="cusdash-field-row">
                    <span className="cusdash-field-label">Two‑Step</span>
                    <span className={`cusdash-badge ${twoStepEnabled ? 'on' : 'off'}`}>
                      {twoStepEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>

                <div className="cusdash-profile-section-card danger">
                  <h3>Danger Zone</h3>
                  <p>Delete your account and all associated data.</p>
                  <button className="cusdash-btn cusdash-btn-danger" onClick={handleDelete}>
                    <FaTrashAlt /> Delete Account
                  </button>
                </div>
              </div>
            )}

            {/* Edit */}
            {profileTab === 'edit' && (
              <div className="cusdash-dashboard-grid cusdash-dashboard-single">
                <div className="cusdash-profile-section-card">
                  <h3>Edit Profile</h3>
                  <form className="cusdash-form" onSubmit={handleUpdate}>
                    <div className="cusdash-form-row">
                      <label>Name</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="cusdash-form-row">
                      <label>Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email || ''}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="cusdash-form-row">
                      <label>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone || ''}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="cusdash-form-row">
                      <label>Address</label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address || ''}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="cusdash-form-actions">
                      <button className="cusdash-btn cusdash-btn-primary" type="submit">
                        <FaSave /> Save Changes
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Security */}
            {profileTab === 'security' && (
              <div className="cusdash-dashboard-grid cusdash-dashboard-single">
                <div className="cusdash-profile-section-card">
                  <h3>Security Settings</h3>

                  <div className="cusdash-two-step-container">
                    <div className="cusdash-two-step-info">
                      <h4>Two-Step Verification</h4>
                      <p>
                        Add an extra layer of security by requiring a verification code when
                        logging in.
                      </p>
                    </div>

                    <div className="cusdash-two-step-toggle">
                      <label className="cusdash-switch">
                        <input
                          type="checkbox"
                          checked={twoStepEnabled}
                          onChange={handleToggleTwoStep}
                          disabled={loadingTwoStep || verifyingOtp}
                        />
                        <span className="cusdash-slider round"></span>
                      </label>
                      <span className="cusdash-toggle-status">
                        {twoStepEnabled ? 'Enabled' : otpSent ? 'Pending verification…' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  {loadingTwoStep && <p className="cusdash-loading-text">Updating settings...</p>}

                  {otpSent && !twoStepEnabled && (
                    <div className="cusdash-otp-container">
                      <input
                        type="text"
                        placeholder="Enter OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={8}
                      />
                      <button
                        onClick={handleVerifyOTP}
                        className="cusdash-btn cusdash-btn-primary"
                        disabled={verifyingOtp}
                      >
                        {verifyingOtp ? 'Verifying…' : 'Verify OTP'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Activity */}
            {profileTab === 'activity' && (
              <div className="cusdash-dashboard-grid cusdash-dashboard-single">
                <div className="cusdash-profile-section-card">
                  <h3>Recent Activity</h3>
                  <ul className="cusdash-activity-list">
                    {(customerData?.activity || []).length === 0 && (
                      <li className="muted">No recent activity.</li>
                    )}
                    {(customerData?.activity || []).map((item, idx) => (
                      <li key={idx}>
                        <span className="when">
                          {item?.when ? new Date(item.when).toLocaleString() : '—'}
                        </span>
                        <span className="what">{item?.what || '—'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

        {/* -------------------- FIND LABOUR -------------------- */}
        {activeTab === 'labors' && (
          <>
            <div className="cusdash-profile-section-card">
              <h3><FaFilter /> Find Labour</h3>

              <div className="cusdash-filter-grid">
                {/* Location: free text OR select a district */}
                <div className="cusdash-form-row">
                  <label>Location</label>
                  <div className="cusdash-input-with-actions">
                    <input
                      type="text"
                      name="location"
                      placeholder="e.g., Colombo"
                      value={filters.location}
                      onChange={handleFilterChange}
                    />
                    <select
                      className="cusdash-compact-select"
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, location: e.target.value, page: 1 }))
                      }
                      value={filters.location}
                    >
                      <option value="">— Select District (optional) —</option>
                      {LK_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Skill */}
                <div className="cusdash-form-row">
                  <label>Skill Category</label>
                  <select
                    name="skillCategory"
                    value={filters.skillCategory}
                    onChange={handleFilterChange}
                  >
                    <option value="">— Any —</option>
                    {SKILL_CATEGORIES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                {/* Age */}
                <div className="cusdash-form-row">
                  <label>Age Category</label>
                  <select
                    name="ageCategory"
                    value={filters.ageCategory}
                    onChange={handleFilterChange}
                  >
                    <option value="">— Any —</option>
                    {AGE_CATEGORIES.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {/* Search */}
                <div className="cusdash-form-row">
                  <label>Search</label>
                  <div className="cusdash-input-with-actions">
                    <input
                      type="text"
                      name="search"
                      placeholder="Name, address, skill..."
                      value={filters.search}
                      onChange={handleFilterChange}
                    />
                    <button
                      className="cusdash-btn"
                      onClick={() => setFilters((prev) => ({ ...prev, page: 1 }))}
                      title="Search"
                      type="button"
                    >
                      <FaSearch /> Search
                    </button>
                  </div>
                </div>

                {/* Sort */}
                <div className="cusdash-form-row">
                  <label>Sort</label>
                  <select
                    name="sort"
                    value={filters.sort}
                    onChange={handleFilterChange}
                  >
                    <option value="recent">Most Recent</option>
                    <option value="nameAsc">Name A–Z</option>
                    <option value="nameDesc">Name Z–A</option>
                    <option value="rateAsc">Daily Rate: Low → High</option>
                    <option value="rateDesc">Daily Rate: High → Low</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="cusdash-form-row align-end">
                  <button className="cusdash-btn" onClick={handleClearFilters} type="button">
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>

            <div className="cusdash-profile-section-card">
              <div className="cusdash-list-header">
                <h3><FaUsers /> Labour Results</h3>
                <div className="muted">
                  Showing page {laborMeta.page} of {laborMeta.totalPages} — {laborMeta.total} total
                </div>
              </div>

              {laborLoading && <p className="cusdash-loading-text">Loading labours…</p>}
              {laborError && <p className="cusdash-error-text">{laborError}</p>}

              {!laborLoading && !laborError && labors.length === 0 && (
                <p className="muted">No labours match your filters.</p>
              )}

              {/* Results grid */}
              <div className="cusdash-card-grid">
                {labors.map((lb) => (
                  <div key={lb._id} className="cusdash-card">
                    <div className="cusdash-card-title">{lb.name}</div>
                    <div className="cusdash-card-subtitle">
                      {lb.skillCategory || '—'} • {lb.ageCategory || '—'}
                    </div>
                    <div className="cusdash-card-body">
                      <div className="cusdash-field-row">
                        <span className="cusdash-field-label">Location</span>
                        <span className="cusdash-field-value">{lb.location || '—'}</span>
                      </div>
                      <div className="cusdash-field-row">
                        <span className="cusdash-field-label">Address</span>
                        <span className="cusdash-field-value">{lb.address || '—'}</span>
                      </div>
                      <div className="cusdash-field-row">
                        <span className="cusdash-field-label">Phone</span>
                        <span className="cusdash-field-value">{lb.phone || '—'}</span>
                      </div>
                      <div className="cusdash-field-row">
                        <span className="cusdash-field-label">Daily Rate</span>
                        <span className="cusdash-field-value">
                          {typeof lb.dailyRate === 'number' ? `Rs. ${lb.dailyRate.toLocaleString()}` : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="cusdash-card-actions">
                      {/* Book */}
                      <button
                        className="cusdash-btn cusdash-btn-primary"
                        type="button"
                        onClick={async () => {
                          try {
                            const result = await Swal.fire({
                              title: 'Send booking request?',
                              text: `We will notify the labor.`,
                              icon: 'question',
                              showCancelButton: true,
                              confirmButtonText: 'Yes, send',
                            });
                            if (!result.isConfirmed) return;

                            await createBooking({ laborId: lb._id });
                            Swal.fire(
                              'Sent',
                              'Your booking request was sent. You will be notified when the labor accepts or rejects.',
                              'success'
                            );
                          } catch (err) {
                            console.error(err);
                            Swal.fire(
                              'Error',
                              err?.response?.data?.error || 'Could not create booking',
                              'error'
                            );
                          }
                        }}
                      >
                        Book
                      </button>

                      <button
                        className="cusdash-btn"
                        type="button"
                        onClick={() =>
                          Swal.fire(
                            lb.name || 'Labour',
                            `Skill: ${lb.skillCategory || '—'}\nAge: ${lb.ageCategory || '—'}\nLocation: ${lb.location || '—'}\nPhone: ${lb.phone || '—'}\nAddress: ${lb.address || '—'}`,
                            'info'
                          )
                        }
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {laborMeta.totalPages > 1 && (
                <div className="cusdash-pagination">
                  <button
                    className="cusdash-btn"
                    disabled={filters.page <= 1}
                    onClick={() => goPage(-1)}
                  >
                    <FaArrowLeft /> Prev
                  </button>
                  <span className="cusdash-page-indicator">
                    Page {laborMeta.page} / {laborMeta.totalPages}
                  </span>
                  <button
                    className="cusdash-btn"
                    disabled={filters.page >= laborMeta.totalPages}
                    onClick={() => goPage(1)}
                  >
                    Next <FaArrowRight />
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* -------------------- BOOKINGS -------------------- */}
        {activeTab === 'bookings' && (
          <div className="cusdash-profile-section-card">
            <h3>Your Bookings</h3>

            {bookingsLoading && <p className="cusdash-loading-text">Loading your bookings…</p>}
            {bookingsError && <p className="cusdash-error-text">{bookingsError}</p>}

            {!bookingsLoading && !bookingsError && bookings.length === 0 && (
              <p className="muted">No bookings yet.</p>
            )}

            {!bookingsLoading && bookings.length > 0 && (
              <ul className="cusdash-booking-list">
                {bookings.map((bk) => {
                  const isPaid = bk?.paymentStatus === 'paid';
                  const showPayBtn = bk?.status === 'accepted' && !isPaid;
                  return (
                    <li key={bk._id} className="cusdash-booking-item">
                      <div className="cusdash-booking-top">
                        <div className="cusdash-booking-title">
                          {formatBookingMessage(bk)}
                        </div>
                        <span className={pillClassForStatus(bk?.status)}>
                          {bk?.status || 'pending'}
                        </span>
                      </div>

                      <div className="cusdash-booking-meta">
                        <span>
                          Requested:&nbsp;
                          {bk?.createdAt ? new Date(bk.createdAt).toLocaleString() : '—'}
                        </span>
                        {bk?.jobDate && (
                          <span>
                            Job Date:&nbsp;{new Date(bk.jobDate).toLocaleDateString()}
                          </span>
                        )}
                        {bk?.labor?.name && (
                          <span>
                            Labor:&nbsp;{bk.labor.name}
                            {bk?.labor?.skillCategory ? ` (${bk.labor.skillCategory})` : ''}
                          </span>
                        )}
                      </div>

                      {bk?.note && (
                        <div className="cusdash-booking-note">
                          Note: {bk.note}
                        </div>
                      )}

                      {/* Payment badges */}
                      {(bk?.paymentMethod || bk?.paymentStatus) && (
                        <div className="cusdash-booking-payment">
                          {renderPaymentBadges(bk)}
                        </div>
                      )}

                      {/* Proceed to payment */}
                      {showPayBtn && (
                        <div className="cusdash-booking-actions">
                          <button
                            className="cusdash-btn cusdash-btn-primary"
                            onClick={() => handleProceedPayment(bk)}
                          >
                            Proceed to Payment
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* -------------------- SUBSCRIPTIONS -------------------- */}
        {activeTab === 'subscriptions' && (
          <div className="cusdash-profile-section-card">
            <h3>Your Subscriptions</h3>
            <p>Coming soon…</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default CustomerDashboard;
