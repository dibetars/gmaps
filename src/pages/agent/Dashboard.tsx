import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentAuthService } from '../../services/auth';
import { MapProvider } from '../../context/MapContext';
import AgentLayout from '../../components/agent/AgentLayout';

const AgentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');

  const handleLogout = () => {
    agentAuthService.clearSession();
    navigate('/agent/login');
  };

  return (
    <MapProvider>
      <div className="app-container">
        <aside className="sidebar">
          <header className="app-header">
            <h1>Agent Portal</h1>
          </header>
          <nav className="nav-menu">
            <button 
              className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveSection('overview')}
            >
              <span className="nav-icon">🗺️</span>
              Overview
            </button>
            <button 
              className="nav-item disabled"
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            >
              <span className="nav-icon">🏪</span>
              Restaurants
            </button>
            <button 
              className="nav-item disabled"
              disabled
              style={{ opacity: 0.5, cursor: 'not-allowed' }}
            >
              <span className="nav-icon">💰</span>
              Earnings
            </button>
            <button 
              className="nav-item logout mt-auto"
              onClick={handleLogout}
            >
              <span className="nav-icon">🚪</span>
              Logout
            </button>
          </nav>
        </aside>
        <main className="main-content">
          <div className="content-section">
            <AgentLayout />
          </div>
        </main>
      </div>
    </MapProvider>
  );
};

export default AgentDashboard; 