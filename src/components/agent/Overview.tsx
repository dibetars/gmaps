import React from 'react';
import WelcomeHeader from './WelcomeHeader';
import RestaurantGraph from './RestaurantGraph';
import RecentActivity from './RecentActivity';
import RestaurantMap from './RestaurantMap';

const Overview: React.FC = () => {
  return (
    <div>
      <WelcomeHeader />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1rem 0' }}>
        <RestaurantGraph />
        <RecentActivity />
      </div>
      <RestaurantMap />
    </div>
  );
};

export default Overview; 