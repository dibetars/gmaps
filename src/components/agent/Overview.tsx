import React from 'react';
import WelcomeHeader from './WelcomeHeader';
import RestaurantGraph from './RestaurantGraph';
import RecentActivity from './RecentActivity';
import RestaurantMap from './RestaurantMap';

const Overview: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <WelcomeHeader />
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '24px',
        marginBottom: '24px'
      }}>
        <RestaurantGraph />
        <RecentActivity />
      </div>
      <RestaurantMap />
    </div>
  );
};

export default Overview; 