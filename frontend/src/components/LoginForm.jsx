import React, { useState } from 'react';
import { loginUser } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginForm.css';
import axios from 'axios';
import Swal from 'sweetalert2';
import { FaUser, FaHardHat, FaUserShield, FaLock } from 'react-icons/fa';

const roles = [
  { key: 'Customer', icon: <FaUser size={26} /> },
  { key: 'Labor', icon: <FaHardHat size={26} /> },
  { key: 'Admin', icon: <FaUserShield size={26} /> },
];

const LoginForm = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: '',
  });

  // OTP state
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [emailForVerification, setEmailForVerification] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingRole, setPendingRole] = useState(''); // <-- keep role for OTP verify

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleSelect = (roleKey) => {
    setFormData((prev) => ({ ...prev, role: roleKey }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await loginUser(formData);
      const data = res.data;

      // If server says OTP is required (Customer or Labor)
      if (data.requiresVerification && data.email) {
        setShowCodeInput(true);
        setEmailForVerification(data.email);
        setPendingRole(data.role || formData.role); // <-- store role for verification
        Swal.fire('Verification Required', data.message || 'Code sent to your email', 'info');
        return;
      }

      // Otherwise, normal login success (token + user)
      if (data.token && data.user) {
        login(data.token, data.user.role);
        Swal.fire('Success', 'Login successful', 'success').then(() =>
          navigate(`/${data.user.role.toLowerCase()}/dashboard`)
        );
        return;
      }

      Swal.fire('Error', 'Unexpected response. Please try again.', 'error');
    } catch (err) {
      Swal.fire('Error', err.response?.data?.error || 'Login failed', 'error');
    }
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:2000/api/laborlink/verify-code', {
        email: emailForVerification,
        code: verificationCode,
        role: pendingRole, // <-- include role so backend targets correct collection
      });

      const { token, user, message } = res.data;
      if (!token || !user?.role) {
        Swal.fire('Verification Failed', 'Unexpected response from server', 'error');
        return;
      }

      login(token, user.role);

      Swal.fire('Success', message || 'Login successful', 'success').then(() => {
        const path = `/${user.role.toLowerCase()}/dashboard`;
        navigate(path);
      });
    } catch (err) {
      Swal.fire('Verification Failed', err.response?.data?.error || 'Invalid code', 'error');
    }
  };

  return (
    <div className="landing-section">
      <div className="login-container">
        {/* Left side form */}
        <div className="login-form-section">
          <h2 className="auth-title">Welcome to LaborLink</h2>

          <form onSubmit={showCodeInput ? handleCodeSubmit : handleLogin}>
            {!showCodeInput && (
              <>
                {/* Role selection (icons) */}
                <div className="role-cards">
                  {roles.map((r) => (
                    <div
                      key={r.key}
                      className={`role-card ${formData.role === r.key ? 'selected' : ''}`}
                      onClick={() => handleRoleSelect(r.key)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRoleSelect(r.key); }}
                      aria-label={r.key}
                      title={r.key}
                    >
                      <div className="role-icon">{r.icon}</div>
                    </div>
                  ))}
                </div>

                <div className="auth-group icon-input">
                  <FaUser className="input-icon" />
                  <input
                    type="text"
                    name="username"
                    placeholder="Enter your username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="auth-group icon-input">
                  <FaLock className="input-icon" />
                  <input
                    type="password"
                    name="password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                <button type="submit" className="auth-button" disabled={!formData.role}>
                  Login
                </button>

                <p className="switch-link">
                  Don’t have an account? <Link to="/select-role">Register</Link>
                </p>
              </>
            )}

            {showCodeInput && (
              <>
                <div className="auth-group">
                  <label htmlFor="code">Enter Verification Code</label>
                  <input
                    type="text"
                    name="code"
                    placeholder={`Code sent to ${emailForVerification}`}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="auth-button">Verify &amp; Login</button>

                <p className="switch-link">
                  Enter the 6-digit code we emailed to <b>{emailForVerification}</b>.
                </p>
              </>
            )}
          </form>
        </div>

        {/* Right side panel */}
        <div className="login-image-section">
          <div className="overlay">
            <h3>Welcome Back!</h3>
            <p>Access your account and explore our services.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
