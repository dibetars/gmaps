import React, { useState, useEffect } from 'react';
import { agentAuthService } from '../../services/auth';
import { restaurantService } from '../../services/restaurantService';
import type { Restaurant } from '../../services/restaurantService';

interface GraphData {
  date: string;
  count: number;
  label: string;
}

const RestaurantGraph: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        // Get user data and restaurant data
        const token = await agentAuthService.getStoredSession();
        if (!token) {
          throw new Error('No authentication token found');
        }

        const userData = await agentAuthService.getUserData(token);
        const restaurants = await restaurantService.getRestaurantByAgentId(userData.id);

        // Get the last 7 days
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const today = new Date();
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date(today);
          date.setDate(date.getDate() - (6 - i));
          return {
            date: date.toISOString().split('T')[0],
            label: days[date.getDay()],
            count: 0
          };
        });

        // Count restaurants created on each day
        restaurants.forEach((restaurant: Restaurant) => {
          const createdDate = new Date(restaurant.created_at || 0).toISOString().split('T')[0];
          const dayData = last7Days.find(day => day.date === createdDate);
          if (dayData) {
            dayData.count++;
          }
        });

        setGraphData(last7Days);
      } catch (error) {
        console.error('Error fetching graph data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  const maxCount = Math.max(...graphData.map(d => d.count));
  const totalCount = graphData.reduce((sum, data) => sum + data.count, 0);

  if (loading) {
    return <div>Loading restaurant data...</div>;
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
        Restaurant Additions
      </h2>
      <p style={{ 
        fontSize: '0.875rem', 
        color: '#6b7280', 
        marginBottom: '1.5rem' 
      }}>
        Weekly overview of new restaurant onboardings
      </p>
      
      <div style={{ 
        display: 'flex', 
        alignItems: 'end', 
        justifyContent: 'space-between', 
        height: '200px', 
        marginBottom: '1.5rem',
        padding: '1rem 0'
      }}>
        {graphData.map((data, index) => (
          <div 
            key={index} 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              flex: 1,
              marginRight: index < graphData.length - 1 ? '0.5rem' : '0'
            }}
          >
            <div
              style={{
                width: '100%',
                maxWidth: '40px',
                backgroundColor: '#3b82f6',
                borderRadius: '4px 4px 0 0',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                height: `${maxCount > 0 ? (data.count / maxCount) * 150 : 8}px`,
                minHeight: '8px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
              title={`${data.count} restaurants on ${data.label}`}
            />
            <div style={{ 
              marginTop: '0.75rem', 
              textAlign: 'center',
              fontSize: '0.875rem'
            }}>
              <p style={{ 
                fontWeight: '600', 
                color: '#1f2937', 
                margin: 0,
                marginBottom: '0.25rem'
              }}>
                {data.count}
              </p>
              <p style={{ 
                fontSize: '0.75rem', 
                color: '#6b7280', 
                margin: 0 
              }}>
                {data.label}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ 
        borderTop: '1px solid #e5e7eb', 
        paddingTop: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ 
            fontSize: '0.875rem', 
            color: '#6b7280' 
          }}>
            Total this week:
          </span>
          <span style={{ 
            fontSize: '1.125rem', 
            fontWeight: 'bold', 
            color: '#1f2937',
            marginLeft: '0.5rem'
          }}>
            {totalCount}
          </span>
        </div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: '#9ca3af' 
        }}>
          Average: {(totalCount / graphData.length).toFixed(1)} per day
        </div>
      </div>
    </div>
  );
};

export default RestaurantGraph; 