import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MapProvider } from './context/MapContext';
import { Map } from './components/Map';
import { GeofenceForm } from './components/GeofenceForm';
import { PlacesList } from './components/PlacesList';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import AgentLogin from './pages/agent/Login';
import AgentDashboard from './pages/agent/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/AdminProtectedRoute';
import Home from './pages/Home';
import AdminLogin from './pages/AdminLogin';

function GeofenceSection() {
  return (
    <div className="geofences-section">
      <div className="floating-controls">
        <div className="floating-panel geofence-form">
          <GeofenceForm />
        </div>
      </div>
      <Map />
    </div>
  );
}

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'geofences':
        return <GeofenceSection />;
      case 'places':
        return (
          <div className="places-section">
            <PlacesList />
          </div>
        );
      case 'settings':
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<AdminLogin />} />
        <Route path="/agent/login" element={<AgentLogin />} />
        <Route
          path="/agent/*"
          element={
            <ProtectedRoute>
              <AgentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <MapProvider>
                <div className="app-container">
                  <aside className="sidebar">
                    <header className="app-header">
                      <h1>Geofence Explorer</h1>
                    </header>
                    <nav className="nav-menu">
                      <button 
                        className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveSection('dashboard')}
                      >
                        <span className="nav-icon">📊</span>
                        Dashboard
                      </button>
                      <button 
                        className={`nav-item ${activeSection === 'geofences' ? 'active' : ''}`}
                        onClick={() => setActiveSection('geofences')}
                      >
                        <span className="nav-icon">📍</span>
                        Geofences
                      </button>
                      <button 
                        className={`nav-item ${activeSection === 'places' ? 'active' : ''}`}
                        onClick={() => setActiveSection('places')}
                      >
                        <span className="nav-icon">🏢</span>
                        Places
                      </button>
                      <button 
                        className={`nav-item ${activeSection === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveSection('settings')}
                      >
                        <span className="nav-icon">⚙️</span>
                        Settings
                      </button>
                      <button 
                        className="nav-item logout"
                        onClick={() => {
                          localStorage.removeItem('adminAuthenticated');
                          localStorage.removeItem('adminUser');
                          window.location.href = '/dashboard';
                        }}
                      >
                        <span className="nav-icon">🚪</span>
                        Logout
                      </button>
                    </nav>
                  </aside>
                  <main className="main-content">
                    <div className="content-section">
                      {renderContent()}
                    </div>
                  </main>
                </div>
              </MapProvider>
            </AdminProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
