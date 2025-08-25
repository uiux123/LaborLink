// frontend/src/components/Dashboards/LaborDashboard.jsx


import React, { useEffect, useMemo, useState } from 'react';
import {
  getLaborDashboard,
  updateLabor,
  deleteLabor,
  toggleTwoStepForLabor,
  sendOTPLabor,
  getLaborBookings,
  acceptBooking,
  rejectBooking,
} from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import {
  FaUser,
  FaCalendarCheck,
  FaRegCreditCard,
  FaSignOutAlt,
  FaEdit,
  FaLock,
  FaHistory,
  FaChartLine,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaIdBadge,
} from 'react-icons/fa';
import './LaborDashboard.css';

const LaborDashboard = () => {
  const [laborData, setLaborData] = useState(null);
  const [formData, setFormData] = useState({});
  const [activeTab, setActiveTab] = useState('profile');
  const [profileTab, setProfileTab] = useState('overview');

  // 2-step state
  const [twoStepEnabled, setTwoStepEnabled] = useState(false);
  const [loadingTwoStep, setLoadingTwoStep] = useState(false);

  // Active/Inactive state
  const [isActive, setIsActive] = useState(true);
  const [togglingActive, setTogglingActive] = useState(false);

  // Bookings state
  const [pendingBookings, setPendingBookings] = useState([]);
  const [acceptedBookings, setAcceptedBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const { logout } = useAuth();
  const navigate = useNavigate();

  // Today
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

  /* ---------------- Load dashboard (profile) ---------------- */
  useEffect(() => {
    const fetchLaborData = async () => {
      try {
        const response = await getLaborDashboard();
        const labor = response?.data?.labor || {};
        setLaborData(labor);
        setFormData(labor);
        setTwoStepEnabled(Boolean(labor.twoStepEnabled));
        setIsActive(labor.isActive !== false);
      } catch (err) {
        console.error('Failed to fetch labor dashboard:', err);
        navigate('/login');
      }
    };
    fetchLaborData();
  }, [navigate]);

  /* ---------------- Load bookings when tab = bookings ---------------- */
  useEffect(() => {
    if (activeTab !== 'bookings') return;

    let timer;
    const loadBoth = async () => {
      try {
        setBookingsLoading(true);

        const [pendingResp, acceptedResp] = await Promise.all([
          getLaborBookings({ status: 'pending' }),
          getLaborBookings({ status: 'accepted' }),
        ]);

        setPendingBookings(Array.isArray(pendingResp?.data?.bookings) ? pendingResp.data.bookings : []);
        setAcceptedBookings(Array.isArray(acceptedResp?.data?.bookings) ? acceptedResp.data.bookings : []);
      } catch (e) {
        console.error('Load labor bookings failed', e);
        Swal.fire('Error', 'Could not load bookings.', 'error');
      } finally {
        setBookingsLoading(false);
      }
    };

    loadBoth();
    // light polling while the tab is open
    timer = setInterval(loadBoth, 12000);
    return () => clearInterval(timer);
  }, [activeTab]);

  /* ---------------- Handlers ---------------- */
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleUpdate = async () => {
    try {
      const response = await updateLabor(formData);
      Swal.fire('Success', 'Details updated successfully!', 'success');
      const updated = response?.data?.updatedLabor || {};
      setLaborData(updated);
      setIsActive(updated?.isActive !== false);
      setTwoStepEnabled(Boolean(updated?.twoStepEnabled));
    } catch (error) {
      console.error('Update failed:', error);
      Swal.fire('Failed', 'Failed to update details.', 'error');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleUpdate();
  };

  const handleDelete = async () => {
    const confirmDelete = await Swal.fire({
      title: 'Are you sure?',
      text: 'This action is irreversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
    });
    if (!confirmDelete.isConfirmed) return;

    try {
      await deleteLabor(formData._id);
      Swal.fire('Deleted', 'Account deleted successfully.', 'success');
      logout();
      navigate('/login');
    } catch (error) {
      console.error('Delete failed:', error);
      Swal.fire('Error', 'Failed to delete account.', 'error');
    }
  };

  const handleToggleTwoStep = async () => {
    if (!laborData?._id) return;
    try {
      setLoadingTwoStep(true);
      const enable = !twoStepEnabled;
      const res = await toggleTwoStepForLabor(laborData._id, enable);
      const newState = !!res?.data?.twoStepEnabled;
      setTwoStepEnabled(newState);
      setLaborData((prev) => (prev ? { ...prev, twoStepEnabled: newState } : prev));

      if (newState) {
        try {
          await sendOTPLabor(laborData._id);
          Swal.fire('Two-Step Enabled', 'OTP sent to your email. You will need it on next login.', 'success');
        } catch (e) {
          console.warn('OTP send failed:', e);
          Swal.fire('Two-Step Enabled', 'Enabled successfully, but OTP email failed.', 'warning');
        }
      } else {
        Swal.fire('Two-Step Disabled', 'You will log in with just your password.', 'info');
      }
    } catch (err) {
      console.error('Failed to toggle 2-step:', err);
      Swal.fire('Error', err?.response?.data?.error || 'Could not update 2-step', 'error');
    } finally {
      setLoadingTwoStep(false);
    }
  };

  const handleToggleActive = async () => {
    if (!laborData?._id) return;
    try {
      setTogglingActive(true);
      const next = !isActive;
      const resp = await updateLabor({ _id: laborData._id, isActive: next });
      const saved = resp?.data?.updatedLabor;
      const newVal = saved?.isActive !== false;
      setIsActive(newVal);
      setLaborData((prev) => (prev ? { ...prev, isActive: newVal } : prev));

      Swal.fire(
        newVal ? 'Now Visible' : 'Set to Inactive',
        newVal ? 'Customers can now find your profile.' : 'Customers will not see your profile while inactive.',
        'success'
      );
    } catch (err) {
      console.error('Active toggle failed:', err);
      Swal.fire('Error', 'Could not update visibility.', 'error');
    } finally {
      setTogglingActive(false);
    }
  };

  const handleDecision = async (bookingId, status) => {
    try {
      const confirm = await Swal.fire({
        title: status === 'accepted' ? 'Accept this booking?' : 'Reject this booking?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: status === 'accepted' ? 'Accept' : 'Reject',
      });
      if (!confirm.isConfirmed) return;

      if (status === 'accepted') {
        await acceptBooking(bookingId);
        // move it from pending → accepted
        setPendingBookings((prev) => prev.filter((b) => b._id !== bookingId));
        // refetch accepted list quickly
        const acceptedResp = await getLaborBookings({ status: 'accepted' });
        setAcceptedBookings(Array.isArray(acceptedResp?.data?.bookings) ? acceptedResp.data.bookings : []);
        Swal.fire('Accepted', 'Customer will be notified of acceptance.', 'success');
      } else {
        await rejectBooking(bookingId);
        setPendingBookings((prev) => prev.filter((b) => b._id !== bookingId));
        Swal.fire('Rejected', 'Customer will be notified of rejection.', 'success');
      }
    } catch (e) {
      console.error(e);
      Swal.fire('Error', e?.response?.data?.error || 'Could not update booking', 'error');
    }
  };

  if (!laborData) return <p className="labor-loading-text">Loading dashboard...</p>;

  const paymentBadges = (b) => {
    const method = b?.paymentMethod || '—';
    const status = b?.paymentStatus || '—';
    return (
      <div className="cusdash-payment-badges">
        {method && method !== '—' && <span className={`pill ${method}`}>{method}</span>}
        {status && status !== '—' && <span className={`pill ${status}`}>{status}</span>}
      </div>
    );
  };

  const paymentMessage = (b) => {
    if (b?.paymentMethod === 'cash') {
      return <div className="cusdash-chip warn">Customer will pay in cash at job location</div>;
    }
    if (b?.paymentMethod === 'card' && b?.paymentStatus === 'paid') {
      return <div className="cusdash-chip success">Card payment received</div>;
    }
    if (b?.paymentMethod === 'card' && b?.paymentStatus === 'pending') {
      return <div className="cusdash-chip">Card payment pending</div>;
    }
    return null;
  };

  return (
    <div className="labor-container">
      {/* Sidebar */}
      <aside className="labor-sidebar">
        <h2 className="labor-sidebar-title">Labor Panel</h2>
        <ul className="labor-sidebar-nav">
          <li className={`labor-nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <FaUser /> Profile
          </li>
          <li className={`labor-nav-item ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
            <FaCalendarCheck /> Bookings
          </li>
          <li className={`labor-nav-item ${activeTab === 'subscriptions' ? 'active' : ''}`} onClick={() => setActiveTab('subscriptions')}>
            <FaRegCreditCard /> Subscriptions
          </li>
          <li className="labor-nav-item labor-logout" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="labor-main-content">
        {/* Header */}
        <div className="labor-header">
          <div>
            <h1>Welcome back, {laborData.name}</h1>
            <p className="labor-subtitle">Here’s a quick overview of your account.</p>
          </div>
          <div className="labor-date">{today}</div>
        </div>

        {/* Quick Stats */}
        <div className="labor-stats">
          <div className="labor-stat-card">
            <div className="labor-stat-top">
              <FaCalendarCheck className="labor-stat-icon" />
              <span className="labor-stat-title">Bookings</span>
            </div>
            <div className="labor-stat-value">{laborData.bookings?.length || 0}</div>
          </div>
          <div className="labor-stat-card">
            <div className="labor-stat-top">
              <FaRegCreditCard className="labor-stat-icon" />
              <span className="labor-stat-title">Subscriptions</span>
            </div>
            <div className="labor-stat-value">{laborData.subscriptions?.length || 0}</div>
          </div>
          <div className="labor-stat-card">
            <div className="labor-stat-top">
              <FaChartLine className="labor-stat-icon" />
              <span className="labor-stat-title">Last Login</span>
            </div>
            <div className="labor-stat-value">{laborData.lastLogin || 'N/A'}</div>
          </div>
        </div>

        {/* Profile Tabs */}
        {activeTab === 'profile' && (
          <>
            <div className="labor-profile-tabs">
              <button className={`labor-profile-tab ${profileTab === 'overview' ? 'active' : ''}`} onClick={() => setProfileTab('overview')}>
                <FaUser /> Overview
              </button>
              <button className={`labor-profile-tab ${profileTab === 'edit' ? 'active' : ''}`} onClick={() => setProfileTab('edit')}>
                <FaEdit /> Edit Profile
              </button>
              <button className={`labor-profile-tab ${profileTab === 'security' ? 'active' : ''}`} onClick={() => setProfileTab('security')}>
                <FaLock /> Security
              </button>
              <button className={`labor-profile-tab ${profileTab === 'activity' ? 'active' : ''}`} onClick={() => setProfileTab('activity')}>
                <FaHistory /> Activity Log
              </button>
            </div>

            {/* Overview */}
            {profileTab === 'overview' && (
              <div className="labor-dashboard-grid">
                <div className="labor-profile-overview">
                  <div className="labor-profile-header">
                    <div className="labor-avatar-circle">
                      {laborData.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="labor-profile-info">
                      <h3>{laborData.name}</h3>
                      <p className="labor-role-label">{laborData.skillCategory}</p>
                    </div>
                  </div>

                  <div className="labor-profile-section-card">
                    <h4>Contact Information</h4>
                    <p><FaEnvelope /> {laborData.email}</p>
                    <p><FaPhone /> {laborData.phone}</p>
                    <p><FaIdBadge /> {laborData.username}</p>
                  </div>

                  <div className="labor-profile-section-card">
                    <h4>Address</h4>
                    <p><FaMapMarkerAlt /> {laborData.address}</p>
                  </div>

                  <div className="labor-profile-section-card">
                    <h4>Personal Details</h4>
                    <p><strong>Age Category:</strong> {laborData.ageCategory}</p>
                    <p><strong>Skill Category:</strong> {laborData.skillCategory}</p>
                    <p>
                      <strong>Status:</strong>{' '}
                      <span className={`labor-badge ${isActive ? 'on' : 'off'}`}>
                        {isActive ? 'Active (Visible)' : 'Inactive (Hidden)'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="labor-activity-timeline">
                  <h3>Recent Activity</h3>
                  {laborData.activity?.length > 0 ? (
                    <ul>
                      {laborData.activity.map((item, idx) => (
                        <li key={idx} className="labor-activity-item">
                          <div className="labor-activity-dot" />
                          <div className="labor-activity-content">
                            <div className="labor-activity-text">{item.description}</div>
                            <div className="labor-activity-date">{item.date}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="labor-empty-state">No recent activity</p>
                  )}
                </div>
              </div>
            )}

            {/* Edit Profile */}
            {profileTab === 'edit' && (
              <div className="labor-profile-update-form">
                <div className="labor-card-head">
                  <h3 className="labor-card-title">Update Your Details</h3>
                  <p className="labor-card-subtitle">Keep your account information up to date.</p>
                </div>

                <form className="labor-form" onSubmit={handleSubmit}>
                  {[
                    { field: 'name', label: 'Full Name', placeholder: 'Enter full name' },
                    { field: 'username', label: 'Username', placeholder: 'Choose a username' },
                    { field: 'email', label: 'Email', placeholder: 'name@example.com' },
                    { field: 'phone', label: 'Phone', placeholder: '+94 77 000 0000' },
                    { field: 'address', label: 'Address', placeholder: 'Street, City, District' },
                  ].map(({ field, label, placeholder }) => (
                    <div className="labor-input-group" key={field}>
                      <label htmlFor={field}>{label}</label>
                      <input
                        id={field}
                        name={field}
                        type={field === 'email' ? 'email' : 'text'}
                        value={formData[field] || ''}
                        onChange={handleChange}
                        required
                        placeholder={placeholder}
                      />
                    </div>
                  ))}

                  <div className="labor-input-group">
                    <label htmlFor="ageCategory">Age Category</label>
                    <select
                      id="ageCategory"
                      name="ageCategory"
                      value={formData.ageCategory || ''}
                      onChange={handleChange}
                      className="labor-select"
                      required
                    >
                      <option value="">Select Age Category</option>
                      <option value="Young Adults">Young Adults (18–25)</option>
                      <option value="Adults">Adults (26–35)</option>
                      <option value="Middle-aged Workers">Middle-aged Workers (36–50)</option>
                      <option value="Senior Workers">Senior Workers (51+)</option>
                    </select>
                  </div>

                  <div className="labor-input-group">
                    <label htmlFor="skillCategory">Skill Category</label>
                    <select
                      id="skillCategory"
                      name="skillCategory"
                      value={formData.skillCategory || ''}
                      onChange={handleChange}
                      className="labor-select"
                      required
                    >
                      <option value="">Select Skill Category</option>
                      <option value="Masons">Masons</option>
                      <option value="Electricians">Electricians</option>
                      <option value="Plumbers">Plumbers</option>
                      <option value="Painters">Painters</option>
                      <option value="Carpenters">Carpenters</option>
                      <option value="Tile Layers">Tile Layers</option>
                      <option value="Welders">Welders</option>
                      <option value="Roofers">Roofers</option>
                      <option value="Helpers/General Labourers">Helpers/General Labourers</option>
                      <option value="Scaffolders">Scaffolders</option>
                    </select>
                  </div>

                  <div className="labor-button-row">
                    <button type="submit" className="labor-btn labor-btn-primary">Save Changes</button>
                    <button type="button" className="labor-btn labor-btn-danger" onClick={handleDelete}>Delete Account</button>
                  </div>
                </form>
              </div>
            )}

            {/* Security */}
            {profileTab === 'security' && (
              <div className="labor-profile-section-card">
                <h3>Security & Visibility</h3>

                <div style={{ marginTop: 8, marginBottom: 18 }}>
                  <p>When enabled, a 6‑digit code sent to your email will be required at login.</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      id="twoStepToggle"
                      type="checkbox"
                      checked={twoStepEnabled}
                      onChange={handleToggleTwoStep}
                      disabled={loadingTwoStep}
                    />
                    <label htmlFor="twoStepToggle" style={{ fontWeight: 700 }}>
                      Two‑Step Verification: {twoStepEnabled ? 'Enabled' : 'Disabled'}
                    </label>
                  </div>
                  {loadingTwoStep && <p className="labor-loading-text" style={{ padding: '10px 0' }}>Updating security settings…</p>}
                </div>

                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
                  <p style={{ marginBottom: 10 }}>Control whether customers can find your profile in search.</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      id="activeToggle"
                      type="checkbox"
                      checked={isActive}
                      onChange={handleToggleActive}
                      disabled={togglingActive}
                    />
                    <label htmlFor="activeToggle" style={{ fontWeight: 700 }}>
                      Visibility: {isActive ? 'Active (Visible to Customers)' : 'Inactive (Hidden)'}
                    </label>
                  </div>
                  {togglingActive && <p className="labor-loading-text" style={{ padding: '10px 0' }}>Updating visibility…</p>}
                </div>
              </div>
            )}

            {/* Activity */}
            {profileTab === 'activity' && (
              <div className="labor-profile-section-card">
                <h3>Activity Log</h3>
                <p>No recent activity.</p>
              </div>
            )}
          </>
        )}

        {/* ---------------- BOOKINGS TAB ---------------- */}
        {activeTab === 'bookings' && (
          <section className="labor-card">
            <h3>Your Bookings</h3>

            {bookingsLoading && <p>Loading…</p>}

            {/* Pending Requests */}
            <div className="labor-profile-section-card">
              <h3>Pending Requests</h3>
              {pendingBookings.length === 0 ? (
                <p className="labor-empty-state">No pending bookings.</p>
              ) : (
                <div className="labor-booking-list">
                  {pendingBookings.map((b) => (
                    <div key={b._id} className="labor-booking-item">
                      <div className="left">
                        <div><strong>Customer:</strong> {b.customerId?.name || '—'}</div>
                        <div><strong>Email:</strong> {b.customerId?.email || '—'}</div>
                        <div><strong>Phone:</strong> {b.customerId?.phone || '—'}</div>
                        <div><strong>Requested:</strong> {b.createdAt ? new Date(b.createdAt).toLocaleString() : '—'}</div>
                        {b.note && <div><strong>Note:</strong> {b.note}</div>}
                      </div>
                      <div className="right">
                        <button className="labor-btn labor-btn-primary" onClick={() => handleDecision(b._id, 'accepted')}>Accept</button>
                        <button className="labor-btn labor-btn-danger" onClick={() => handleDecision(b._id, 'rejected')}>Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Accepted Jobs (show payment info) */}
            <div className="labor-profile-section-card">
              <h3>Accepted Jobs</h3>
              {acceptedBookings.length === 0 ? (
                <p className="labor-empty-state">No accepted jobs yet.</p>
              ) : (
                <div className="labor-booking-list">
                  {acceptedBookings.map((b) => (
                    <div key={b._id} className="labor-booking-item">
                      <div className="left">
                        <div className="cusdash-booking-top">
                          <div className="cusdash-booking-title">
                            {`Accepted — ${b.customerId?.name || 'Customer'}`}
                          </div>
                          <span className="pill accepted">accepted</span>
                        </div>

                        <div className="cusdash-booking-meta">
                          <span>Requested: {b.createdAt ? new Date(b.createdAt).toLocaleString() : '—'}</span>
                          {b.jobDate && <span>Job Date: {new Date(b.jobDate).toLocaleDateString()}</span>}
                          {b.customerId?.address && <span>Location: {b.customerId.address}</span>}
                        </div>

                        {/* Payment badges + message */}
                        {paymentBadges(b)}
                        {paymentMessage(b)}

                        {b.note && <div className="cusdash-booking-note">Note: {b.note}</div>}
                      </div>
                      {/* For accepted we usually don't show Accept/Reject buttons */}
                      <div className="right" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Subscriptions */}
        {activeTab === 'subscriptions' && (
          <section className="labor-card">
            <h3>Your Subscriptions</h3>
            <p>No subscriptions yet.</p>
          </section>
        )}
      </main>
    </div>
  );
};

export default LaborDashboard;
