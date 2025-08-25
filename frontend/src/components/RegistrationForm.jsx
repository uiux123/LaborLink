import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FaUser, FaIdBadge, FaLock, FaEnvelope, FaHome, FaPhone,
  FaChild, FaUserTie, FaUsers, FaUserShield,
  FaHammer, FaWrench, FaPaintBrush, FaCarSide, FaTools, FaMapMarkerAlt, FaMoneyBillWave
} from 'react-icons/fa';
import { registerCustomer, registerLabor } from '../services/api';
import Swal from 'sweetalert2';
import './RegistrationForm.css';

const ageOptions = [
  { value: 'Young Adults', label: 'Young Adults (18–25)', icon: <FaChild /> },
  { value: 'Adults', label: 'Adults (26–35)', icon: <FaUserTie /> },
  { value: 'Middle-aged Workers', label: 'Middle-aged (36–50)', icon: <FaUsers /> },
  { value: 'Senior Workers', label: 'Senior (51+)', icon: <FaUserShield /> },
];

const skillOptions = [
  { value: 'Masons', label: 'Masons', icon: <FaHammer /> },
  { value: 'Electricians', label: 'Electricians', icon: <FaWrench /> },
  { value: 'Plumbers', label: 'Plumbers', icon: <FaWrench /> },
  { value: 'Painters', label: 'Painters', icon: <FaPaintBrush /> },
  { value: 'Carpenters', label: 'Carpenters', icon: <FaCarSide /> },
  { value: 'Tile Layers', label: 'Tile Layers', icon: <FaTools /> },
  { value: 'Welders', label: 'Welders', icon: <FaHammer /> },
  { value: 'Roofers', label: 'Roofers', icon: <FaTools /> },
  { value: 'Helpers/General Labourers', label: 'Helpers/General', icon: <FaUsers /> },
  { value: 'Scaffolders', label: 'Scaffolders', icon: <FaHammer /> },
];

const RegistrationForm = () => {
  const { role } = useParams();

  const [formData, setFormData] = useState({
    role: role || 'customer',
    name: '',
    username: '',
    password: '',
    email: '',
    address: '',
    phone: '',
    // labor-only
    location: '',       // <-- NEW (required for labor)
    ageCategory: '',
    skillCategory: '',
    dailyRate: ''       // optional
  });

  useEffect(() => {
    setFormData((prev) => ({ ...prev, role: role || 'customer' }));
  }, [role]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // keep dailyRate numeric but allow empty
    if (name === 'dailyRate') {
      const cleaned = value.replace(/[^\d]/g, '');
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelect = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let res;
      const dataToSend = { ...formData };

      if (formData.role === 'customer') {
        // strip labor-only fields
        delete dataToSend.location;
        delete dataToSend.ageCategory;
        delete dataToSend.skillCategory;
        delete dataToSend.dailyRate;
        res = await registerCustomer(dataToSend);
      } else if (formData.role === 'labor') {
        // make sure location is present for labor
        if (!dataToSend.location?.trim()) {
          Swal.fire('Please enter your city/district (Location).');
          return;
        }
        // send dailyRate as number if provided
        if (dataToSend.dailyRate === '') delete dataToSend.dailyRate;
        else dataToSend.dailyRate = Number(dataToSend.dailyRate);
        res = await registerLabor(dataToSend);
      } else {
        Swal.fire('Invalid role selection.');
        return;
      }

      Swal.fire(res.data.message || 'Registered Successfully!');
      setFormData({
        role: role || 'customer',
        name: '',
        username: '',
        password: '',
        email: '',
        address: '',
        phone: '',
        location: '',
        ageCategory: '',
        skillCategory: '',
        dailyRate: ''
      });
    } catch (error) {
      Swal.fire(error.response?.data?.error || error.message || 'Registration failed.');
    }
  };

  const isLabor = formData.role === 'labor';

  return (
    <div className="registration-wrapper">
      <div className="rg-shadow-box">
        <div className="rg-header">
          <h2>Register as {isLabor ? 'Labor' : 'Customer'}</h2>
          <p>Please fill out the form below to get started.</p>
        </div>

        <form onSubmit={handleSubmit} className="rg-form">
          <div className="rg-input-group">
            <FaUser className="input-icon" />
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="rg-input-group">
            <FaIdBadge className="input-icon" />
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="rg-input-group">
            <FaLock className="input-icon" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="rg-input-group">
            <FaEnvelope className="input-icon" />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="rg-input-group">
            <FaHome className="input-icon" />
            <input
              type="text"
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={handleChange}
              required
            />
          </div>

          <div className="rg-input-group">
            <FaPhone className="input-icon" />
            <input
              type="tel"
              name="phone"
              placeholder="Phone Number"
              value={formData.phone}
              onChange={handleChange}
              required
            />
          </div>

          {isLabor && (
            <>
              {/* LOCATION (required for labor) */}
              <div className="rg-input-group">
                <FaMapMarkerAlt className="input-icon" />
                <input
                  type="text"
                  name="location"
                  placeholder="City / District (e.g., Kandy)"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* AGE CATEGORY */}
              <div className="select-group">
                <p className="select-label">Select Age Category</p>
                <div className="select-cards">
                  {ageOptions.map((opt) => (
                    <div
                      key={opt.value}
                      className={`select-card ${formData.ageCategory === opt.value ? 'selected' : ''}`}
                      onClick={() => handleSelect('ageCategory', opt.value)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' ? handleSelect('ageCategory', opt.value) : null)}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* SKILL CATEGORY */}
              <div className="select-group">
                <p className="select-label">Select Skill Category</p>
                <div className="select-cards">
                  {skillOptions.map((opt) => (
                    <div
                      key={opt.value}
                      className={`select-card ${formData.skillCategory === opt.value ? 'selected' : ''}`}
                      onClick={() => handleSelect('skillCategory', opt.value)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' ? handleSelect('skillCategory', opt.value) : null)}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* OPTIONAL DAILY RATE */}
              <div className="rg-input-group">
                <FaMoneyBillWave className="input-icon" />
                <input
                  type="text"
                  name="dailyRate"
                  placeholder="Daily Rate (Rs.) — optional"
                  value={formData.dailyRate}
                  onChange={handleChange}
                  inputMode="numeric"
                />
              </div>
            </>
          )}

          <button type="submit" className="rg-submit-btn">Next Step</button>
          <p className="rg-login-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default RegistrationForm;
