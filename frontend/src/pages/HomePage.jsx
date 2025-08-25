import React from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Homepage.css";
import { FiUser } from "react-icons/fi";
import logo from '../pages/Black_and_White_Modern_Personal_Brand_Logo-removebg-preview.png';

const HomePage = () => {
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const handleUserIconClick = () => {
    if (!token) {
      navigate("/login");
    } else if (role === "Customer") {
      navigate("/customer/dashboard");
    } else if (role === "Labor") {
      navigate("/labor/dashboard");
    } else if (role === "Admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/login");
    }
  };

  const handleGetStartedClick = () => {
    if (!token) {
      navigate("/select-role");
    } else if (role === "Customer") {
      navigate("/customer/dashboard");
    } else if (role === "Labor") {
      navigate("/labor/dashboard");
    } else if (role === "Admin") {
      navigate("/admin/dashboard");
    } else {
      navigate("/register");
    }
  };

  return (
    <div className="homepage">
      {/* Header */}
      <div className="landing-section">
        <header className="header">
          <div className="header-container">
            <div className="logo-section">
              <img src={logo} alt="Logo" className="logo" />
            </div>

            <nav className="nav-menu">
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/about" className="nav-link">About Us</Link>
              <Link to="/find-worker" className="nav-link">Find a Worker</Link>
              <Link to="/subscriptions" className="nav-link">Subscriptions</Link>
              <Link to="/contact" className="nav-link">Contact Us</Link>
            </nav>

            <div className="user-icon-link" onClick={handleUserIconClick}>
              <div className="user-icon">
                <FiUser size={24} color="#6b52ff" />
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-container">
            <h1 className="hero-title">Manage Your Workforce with Confidence</h1>
            <h2 className="hero-subtitle">
              Connecting Workers, Contractors & Site Managers Seamlessly
            </h2>
            <p className="hero-description">
              Easily schedule shifts, track labor availability, and monitor project
              progress — all from one platform.
            </p>
            <button className="hero-button" onClick={handleGetStartedClick}>
              Get Started
            </button>
          </div>
        </section>
      </div>

      {/* Top Rated Workers */}
      <section className="top-workers-section">
        <div className="top-workers-container">
          <h2 className="section-title">Top Rated Workers</h2>
          <div className="workers-grid">
            <div className="worker-card">
              <div className="avatar">SE</div>
              <h3 className="worker-name">Skilled Electrician</h3>
              <p className="worker-location">Colombo</p>
              <p className="worker-rate">LKR 3,500/day</p>
              <p className="worker-description">Reliable and experienced in large-scale projects.</p>
              <div className="worker-rating">★★★★★</div>
              <button className="worker-btn">View Profile</button>
            </div>

            <div className="worker-card">
              <div className="avatar">MS</div>
              <h3 className="worker-name">Mason Specialist</h3>
              <p className="worker-location">Kandy</p>
              <p className="worker-rate">LKR 2,800/day</p>
              <p className="worker-description">Fast, efficient, and detail-oriented.</p>
              <div className="worker-rating">★★★★★</div>
              <button className="worker-btn">View Profile</button>
            </div>

            <div className="worker-card">
              <div className="avatar">SP</div>
              <h3 className="worker-name">Skilled Plumber</h3>
              <p className="worker-location">Galle</p>
              <p className="worker-rate">LKR 4,000/day</p>
              <p className="worker-description">Plumber with 10+ years of experience.</p>
              <div className="worker-rating">★★★★★</div>
              <button className="worker-btn">View Profile</button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="features-container">
          <h2 className="section-title">Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🔍</div>
              <h3 className="feature-title">Smart Labor Search</h3>
              <p className="feature-desc">Find skilled workers based on trade, location & availability.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📍</div>
              <h3 className="feature-title">Map-Based Worker Discovery</h3>
              <p className="feature-desc">Locate workers closest to your project site.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⚙️</div>
              <h3 className="feature-title">Task Allocation Tool</h3>
              <p className="feature-desc">Assign and track tasks for individuals.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🔔</div>
              <h3 className="feature-title">Shift Alerts</h3>
              <p className="feature-desc">Automated notifications for shift changes and assignments.</p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">✔️</div>
              <h3 className="feature-title">Verified Profiles</h3>
              <p className="feature-desc">Only trusted, verified workers and contractors listed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="reviews-section">
        <div className="reviews-container">
          <h2 className="section-title">Reviews</h2>
          <div className="reviews-grid">
            <div className="review-card">
              <div className="avatar-large">JW</div>
              <h3 className="review-name">James W.</h3>
              <p className="review-text">"Excellent system to coordinate multiple sites. Reduced delays by 30%!"</p>
            </div>

            <div className="review-card">
              <div className="avatar-large">DK</div>
              <h3 className="review-name">Daniel K.</h3>
              <p className="review-text">"The dashboard gives me full visibility on who's working where and when."</p>
            </div>

            <div className="review-card">
              <div className="avatar-large">AM</div>
              <h3 className="review-name">Arjun M.</h3>
              <p className="review-text">"Easy to find good projects and manage my work schedule."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section company-info">
            <div className="footer-logo-container">
              <img src={logo} alt="Logo" className="logo" />
            </div>
            <p className="footer-text">"Your Trusted Property Partner"</p>
            <p className="footer-text">Connecting buyers and sellers with ease and transparency.</p>
            <div className="social-icons">
            </div>
          </div>

          <div className="footer-section quick-links">
            <h3>Quick Links</h3>
            <ul>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/find-worker">Find a Worker</Link></li>
              <li><Link to="/subscriptions">Subscriptions</Link></li>
              <li><Link to="/contact">Contact Us</Link></li>
            </ul>
          </div>

          <div className="footer-section helpful-resources">
            <h3>Helpful Resources</h3>
            <ul>
              <li><a href="/">Terms & Conditions</a></li>
              <li><a href="/">Privacy Policy</a></li>
              <li><a href="/">Blog</a></li>
              <li><a href="/">Support Center</a></li>
              <li><a href="/">How It Works</a></li>
            </ul>
          </div>

          <div className="footer-section contact-info">
            <h3>Contact Info</h3>
            <p>Email: info@lms.com</p>
            <p>Phone: +94 11 234 5678</p>
            <p>Address: 123 Main Street, Colombo, Sri Lanka</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} LaborLink. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
