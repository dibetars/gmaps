import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import './Home.css';

const Home: React.FC = () => {
  return (
    <div className="home-page">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <img src={logo} alt="MapOps Logo" className="nav-logo-img" />
          </div>
          <div className="nav-links">
            <Link to="/dashboard" className="nav-link admin-login">
              Login as Admin
            </Link>
            <Link to="/agent/login" className="nav-link agent-login">
              Login as Agent
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <h1 className="hero-title">Map Ops</h1>
          <p className="hero-subtitle">Geofencing made convenient.</p>
          <div className="hero-buttons">
            <Link to="/dashboard" className="hero-btn primary">
              Get Started as Admin
            </Link>
            <Link to="/agent/login" className="hero-btn secondary">
              Agent Access
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about">
        <div className="about-container">
          <h2 className="about-title">Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🗺️</div>
              <h3>Interactive Mapping</h3>
              <p>Visualize and manage geofences with our intuitive interactive map interface.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📍</div>
              <h3>Smart Geofencing</h3>
              <p>Create, edit, and monitor geofences with precision and real-time updates.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Analytics Dashboard</h3>
              <p>Comprehensive insights and reporting tools for geofence performance tracking.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Multi-User Access</h3>
              <p>Role-based access control for admins and agents with secure authentication.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Real-Time Monitoring</h3>
              <p>Live tracking and instant notifications for geofence entry and exit events.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔧</div>
              <h3>Easy Configuration</h3>
              <p>Simple setup and configuration tools for quick deployment and management.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <p>
            MapOps 2025 Powered by{' '}
            <a 
              href="https://www.krontiva.africa" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            >
              Krontiva
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home; 