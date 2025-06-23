import React from 'react';
import WelcomeHeader from './WelcomeHeader';
import RestaurantGraph from './RestaurantGraph';
import RecentActivity from './RecentActivity';
import RestaurantMap from './RestaurantMap';

const Overview: React.FC = () => {
  return {
    row1: <WelcomeHeader />,
    row2: {
      left: <RestaurantGraph />,
      right: <RecentActivity />
    },
    row3: <RestaurantMap />
  };
};

export default Overview; 