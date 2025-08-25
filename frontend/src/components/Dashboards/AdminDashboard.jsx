import React, { useEffect, useState } from 'react';
import { getAdminDashboard } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaTachometerAlt, FaSignOutAlt, FaUserShield, FaUsers, FaHardHat } from 'react-icons/fa';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [adminUsername, setAdminUsername] = useState('');
  const [counts, setCounts] = useState({ admins: 0, customers: 0, labors: 0 });
  const [activeTab, setActiveTab] = useState('dashboard');
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const response = await getAdminDashboard();
        if (response.data?.success) {
          setAdminUsername(response.data.adminUsername);
          setCounts({
            admins: response.data.adminCount || 0,
            customers: response.data.customerCount || 0,
            labors: response.data.laborCount || 0,
          });
        } else {
          navigate('/login');
        }
      } catch {
        navigate('/login');
      }
    };

    fetchAdminData();
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-dashboard">
      <aside className="sidebar">
        <h2 className="logo">LABOR<span>LINK</span></h2>
        <ul className="nav-list">
          <li className={activeTab === 'dashboard' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('dashboard')}>
            <FaTachometerAlt className="icon" />
            <span>Dashboard</span>
          </li>
          <li className="nav-item" onClick={handleLogout}>
            <FaSignOutAlt className="icon" />
            <span>Logout</span>
          </li>
        </ul>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <h3>Welcome, <strong>{adminUsername}</strong></h3>
        </header>

        {activeTab === 'dashboard' && (
          <section className="dashboard-section">
            <h2>System Overview</h2>
            <div className="cards">
              <div className="card">
                <FaUserShield className="card-icon" />
                <h3>{counts.admins}</h3>
                <p>Admins</p>
              </div>
              <div className="card">
                <FaUsers className="card-icon" />
                <h3>{counts.customers}</h3>
                <p>Customers</p>
              </div>
              <div className="card">
                <FaHardHat className="card-icon" />
                <h3>{counts.labors}</h3>
                <p>Labors</p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
