import React, { useEffect, useState } from 'react';
import { agentAuthService } from '../../services/auth';
import { restaurantService } from '../../services/restaurantService';
import AddRestaurant from './AddRestaurant';
import RecentActivity from './RecentActivity';

interface UserData {
  id: string;
  email: string;
  created_at: number;
}

interface StatsData {
  totalRestaurants: number;
  totalEarnings: number;
  pinnedPlaces: number;
  completedToday: number;
}

const WelcomeHeader: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<StatsData>({
    totalRestaurants: 0,
    totalEarnings: 0,
    pinnedPlaces: 0,
    completedToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchData = async () => {
    const token = await agentAuthService.getStoredSession();
    if (token) {
      try {
        // Get user data
        const data = await agentAuthService.getUserData(token);
        setUserData(data);

        // Get restaurant data
        const restaurants = await restaurantService.getRestaurantByAgentId(data.id);
        
        // Calculate stats
        const totalRestaurants = restaurants.length;
        const totalEarnings = totalRestaurants * 15; // Each restaurant worth 15
        const pinnedPlaces = restaurants.reduce((total, restaurant) => 
          total + (restaurant.branches?.length || 0), 0);
        
        // For completed today, we could add a proper date check if needed
        const completedToday = pinnedPlaces; // For now, using same as pinnedPlaces

        setStats({
          totalRestaurants,
          totalEarnings,
          pinnedPlaces,
          completedToday
        });
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    } else {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshTrigger(prev => prev + 1); // Increment trigger to cause RecentActivity refresh
    await fetchData();
  };

  const handleRecentActivityRefresh = () => {
    setRefreshing(false); // Turn off refresh state when RecentActivity is done
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading agent data...</div>;
  }

  return (
    <>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              fontSize: '1.875rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '8px'
            }}>
              Welcome back, {userData?.email.split('@')[0] || 'Agent'}
            </h1>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              Here's what's happening with your restaurants today.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                backgroundColor: 'white',
                color: '#2563eb',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid #2563eb',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '42px',
                height: '42px',
                transition: 'all 0.2s'
              }}
            >
              <svg 
                style={{
                  width: '20px',
                  height: '20px',
                  transform: refreshing ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.5s'
                }}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                />
              </svg>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.375rem',
                border: 'none',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.2s'
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>+</span>
              Add Restaurant
            </button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem'
        }}>
          <div style={{
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Total Restaurants
            </h3>
            <p style={{ color: '#1f2937', fontSize: '1.5rem', fontWeight: '600' }}>
              {stats.totalRestaurants}
            </p>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Potential Earnings
            </h3>
            <p style={{ color: '#1f2937', fontSize: '1.5rem', fontWeight: '600' }}>
              GH₵ {stats.totalEarnings}
            </p>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Places
            </h3>
            <p style={{ color: '#1f2937', fontSize: '1.5rem', fontWeight: '600' }}>
              {stats.pinnedPlaces}
            </p>
          </div>

          <div style={{
            padding: '1rem',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <h3 style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              Completed Today
            </h3>
            <p style={{ color: '#1f2937', fontSize: '1.5rem', fontWeight: '600' }}>
              {stats.completedToday}
            </p>
          </div>
        </div>

        {showAddModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <AddRestaurant onClose={() => setShowAddModal(false)} />
          </div>
        )}
      </div>
      <RecentActivity 
        refreshTrigger={refreshTrigger}
        onRefresh={handleRecentActivityRefresh}
      />
    </>
  );
};

export default WelcomeHeader; 