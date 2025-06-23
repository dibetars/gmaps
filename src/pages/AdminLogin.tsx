import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './AdminLogin.css';

const AdminLogin: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Simulate API call - replace with actual authentication logic
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, accept any email/password combination
      if (formData.email && formData.password) {
        // Store authentication state (you might want to use a proper auth context)
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminUser', JSON.stringify({
          email: formData.email,
          name: formData.email.split('@')[0],
          role: 'admin'
        }));
        
        navigate('/admin/dashboard');
      } else {
        setError('Please fill in all fields');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="login-container">
        <div className="login-header">
          <Link to="/" className="back-home">
            ← Back to Home
          </Link>
          <div className="login-logo">
            <h1>MapOps</h1>
            <p>Admin Portal</p>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <h2>Admin Login</h2>
            <p>Access your dashboard and manage geofencing operations</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="admin@mapops.com"
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


        </div>

        <div className="login-features">
          <div className="feature-item">
            <span className="feature-icon">🔐</span>
            <span>Secure Authentication</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📊</span>
            <span>Analytics Dashboard</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🗺️</span>
            <span>Advanced Mapping</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin; 