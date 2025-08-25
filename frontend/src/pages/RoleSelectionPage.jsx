import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaHardHat, FaUserShield } from 'react-icons/fa';
import './RoleSelectionPage.css';

const roles = [
  { id: 'customer', label: 'Customer', icon: <FaUser size={40} />, desc: 'Post job requests and hire skilled labor easily.' },
  { id: 'labor', label: 'Labor', icon: <FaHardHat size={40} />, desc: 'Find work opportunities and grow your client base.' },
  { id: 'admin', label: 'Admin', icon: <FaUserShield size={40} />, desc: 'Manage users, jobs, and platform settings. Login only.' },
];

const RoleSelectionPage = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);

  const handleContinue = () => {
    if (!selectedRole) return;
    if (selectedRole === 'admin') {
      navigate('/login');
    } else {
      navigate(`/register/${selectedRole}`);
    }
  };

  return (
    <div className="select-role-wrapper">
      <div className="select-role-container">
        <h2 className="select-role-title">Choose Your Role</h2>
        <p className="select-role-subtitle">
          Select the role that best fits you to get started.
        </p>

        <div className="select-role-grid">
          {roles.map((role) => (
            <div
              key={role.id}
              className={`select-role-card ${selectedRole === role.id ? 'selected' : ''}`}
              onClick={() => setSelectedRole(role.id)}
            >
              <div className="select-role-icon">{role.icon}</div>
              <h3 className="select-role-label">{role.label}</h3>
              <p className="select-role-desc">{role.desc}</p>
            </div>
          ))}
        </div>

        <button
          className="select-role-continue-btn"
          onClick={handleContinue}
          disabled={!selectedRole}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default RoleSelectionPage;
