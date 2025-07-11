import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { agentAuthService } from '../../services/auth';
import { restaurantService } from '../../services/restaurantService';
import logo from '../../assets/logo.png';
import './Login.css';

const AgentLogin: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { authToken } = await agentAuthService.login(formData.username, formData.password);
      await agentAuthService.storeSession(authToken);
      const userData = await agentAuthService.getUserData(authToken);
      // userData.id is now a number
      await restaurantService.getRestaurantByAgentId(userData.id);
      navigate('/agent/dashboard');
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="agent-login-page">
      <div className="login-container">
        <div className="login-header">
          <Link to="/" className="back-home">
            ← Back to Home
          </Link>
          <div className="login-logo">
            <img src={logo} alt="MapOps Logo" />
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <h2>Agent Login</h2>
            <p>Access your assigned geofencing operations and monitoring tools</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter your username"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                required
                className="form-input"
              />
            </div>

            <button 
              type="submit" 
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Don't have an account?{' '}
              <Link to="/agent/signup" className="agent-link">
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        <div className="login-features">
          <div className="feature-item">
            <span className="feature-icon">🏢</span>
            <span>Restaurant Management</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📍</span>
            <span>Location Monitoring</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <span>Real-time Analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentLogin; 