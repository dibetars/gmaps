import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLoadScript } from '@react-google-maps/api';
import { agentAuthService } from '../../services/auth';
import logo from '../../assets/logo.png';
import './Login.css';

interface SignUpFormData {
  fullName: string;
  sex: string;
  email: string;
  momoNumber: string;
  whatsappNumber: string;
  location: string;
  educationLevel: string;
}

const libraries: ("places")[] = ["places"];

const AgentSignUp: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SignUpFormData>({
    fullName: '',
    sex: '',
    email: '',
    momoNumber: '',
    whatsappNumber: '',
    location: '',
    educationLevel: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const locationInputRef = useRef<HTMLInputElement>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '') as string,
    libraries
  });

  useEffect(() => {
    if (isLoaded && locationInputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current, {
        types: ['geocode'],
        componentRestrictions: { country: 'GH' }
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          setFormData(prev => ({
            ...prev,
            location: place.formatted_address || ''
          }));
        }
      });
    }
  }, [isLoaded]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.sex) {
      setError('Please select your sex');
      return false;
    }
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.momoNumber.trim()) {
      setError('MoMo number is required');
      return false;
    }
    if (!formData.whatsappNumber.trim()) {
      setError('WhatsApp number is required');
      return false;
    }
    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }
    if (!formData.educationLevel) {
      setError('Please select your education level');
      return false;
    }
    return true;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Map form data to API structure
      const apiData = {
        full_name: formData.fullName,
        sex: formData.sex,
        email: formData.email,
        momo_number: formData.momoNumber,
        whatsapp_number: formData.whatsappNumber,
        location: formData.location,
        education_level: formData.educationLevel
      };

      await agentAuthService.signUp(apiData);
      
      setSuccess('Sign up successful! Please wait for admin approval.');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="agent-login-page">
      <div className="signup-container">
        <div className="login-header">
          <Link to="/agent/login" className="back-home">
            ← Back to Login
          </Link>
          <div className="login-logo">
            <img src={logo} alt="MapOps Logo" />
            <p>Agent Registration</p>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <h2>Agent Sign Up</h2>
            <p>Join our team of professional agents</p>
          </div>

          <form onSubmit={handleSignUp} className="login-form">
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                <span className="success-icon">✅</span>
                {success}
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="sex">Sex</label>
                <select
                  id="sex"
                  name="sex"
                  value={formData.sex}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                >
                  <option value="">Select your sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email address"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="momoNumber">Mobile Money Number</label>
                <input
                  type="tel"
                  id="momoNumber"
                  name="momoNumber"
                  value={formData.momoNumber}
                  onChange={handleInputChange}
                  placeholder="Enter your MoMo number"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="whatsappNumber">WhatsApp Number</label>
                <input
                  type="tel"
                  id="whatsappNumber"
                  name="whatsappNumber"
                  value={formData.whatsappNumber}
                  onChange={handleInputChange}
                  placeholder="Enter your WhatsApp number"
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="location">Location</label>
                <input
                  ref={locationInputRef}
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Start typing your location..."
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group full-width">
                <label htmlFor="educationLevel">Education Level</label>
                <select
                  id="educationLevel"
                  name="educationLevel"
                  value={formData.educationLevel}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                >
                  <option value="">Select your education level</option>
                  <option value="Basic Education">Basic Education</option>
                  <option value="Senior High School">Senior High School</option>
                  <option value="Technical/Vocational">Technical/Vocational</option>
                  <option value="Diploma">Diploma</option>
                  <option value="Bachelor's Degree">Bachelor's Degree</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="PhD">PhD</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <button 
              type="submit" 
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Already have an account?{' '}
              <Link to="/agent/login" className="agent-link">
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        <div className="login-features">
          <div className="feature-item">
            <span className="feature-icon">👥</span>
            <span>Join Our Team</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">💼</span>
            <span>Professional Growth</span>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🚀</span>
            <span>Career Opportunities</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentSignUp; 