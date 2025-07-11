import React, { useState, useEffect } from 'react';
import { agentAuthService } from '../../services/auth';
import { restaurantService } from '../../services/restaurantService';
import type { Restaurant } from '../../services/restaurantService';

interface ExtendedRestaurant extends Restaurant {
  business_name: string;
  address: string;
  approval_status: string;
  email: string;
  phone_number: string;
  branches: Array<{
    name: string;
    address: string;
    latitude: string;
    longitude: string;
    phoneNumber: string;
    city: string;
  }>;
}

interface RecentActivityProps {
  onRefresh?: () => void;
  refreshTrigger?: number;
}

const ITEMS_PER_PAGE = 2;

const RecentActivity: React.FC<RecentActivityProps> = ({ onRefresh, refreshTrigger }) => {
  const [restaurants, setRestaurants] = useState<ExtendedRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const token = await agentAuthService.getStoredSession();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const userData = await agentAuthService.getUserData(token);
      const restaurantData = await restaurantService.getRestaurantByAgentId(userData.id);

      // Sort restaurants by creation date (newest first)
      const sortedRestaurants = restaurantData.sort((a, b) => 
        (b.created_at || 0) - (a.created_at || 0)
      );
      
      setRestaurants(sortedRestaurants as ExtendedRestaurant[]);
      
      // If this was triggered by a refresh, notify the parent
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [refreshTrigger]); // Re-fetch when refreshTrigger changes

  const totalPages = Math.ceil(restaurants.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentRestaurants = restaurants.slice(startIndex, endIndex);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return '#22c55e'; // green
      case 'pending':
        return '#eab308'; // yellow
      case 'rejected':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  if (loading) {
    return <div>Loading restaurants...</div>;
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      padding: '24px'
    }}>
      <h2 style={{ 
        fontSize: '1.5rem', 
        fontWeight: '600', 
        color: '#1f2937', 
        marginBottom: '1rem' 
      }}>
        Your Restaurants
      </h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {currentRestaurants.length > 0 ? (
          currentRestaurants.map((restaurant) => (
            <div 
              key={restaurant.id} 
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '1rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem'
                }}>
                  <h4 style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#1f2937', 
                    margin: 0
                  }}>
                    {restaurant.business_name}
                  </h4>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    backgroundColor: getStatusColor(restaurant.approval_status),
                    color: 'white',
                    textTransform: 'capitalize'
                  }}>
                    {restaurant.approval_status}
                  </span>
                </div>
                <p style={{ 
                  fontSize: '0.875rem', 
                  color: '#6b7280', 
                  margin: '0 0 0.25rem 0'
                }}>
                  {restaurant.address}
                </p>
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  fontSize: '0.75rem',
                  color: '#9ca3af'
                }}>
                  <span>{restaurant.email}</span>
                  <span>•</span>
                  <span>{restaurant.phone_number}</span>
                  <span>•</span>
                  <span>{restaurant.branches.length} branch{restaurant.branches.length !== 1 ? 'es' : ''}</span>
                </div>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#9ca3af', 
                  margin: '0.5rem 0 0 0'
                }}>
                  Added on {new Date(restaurant.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p style={{ 
            color: '#6b7280', 
            textAlign: 'center', 
            padding: '2rem',
            fontStyle: 'italic'
          }}>
            No restaurants found
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '1.5rem'
        }}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #e5e7eb',
              backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
              color: currentPage === 1 ? '#9ca3af' : '#1f2937',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
            }}
          >
            Previous
          </button>
          <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.375rem',
              border: '1px solid #e5e7eb',
              backgroundColor: currentPage === totalPages ? '#f3f4f6' : 'white',
              color: currentPage === totalPages ? '#9ca3af' : '#1f2937',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentActivity; 