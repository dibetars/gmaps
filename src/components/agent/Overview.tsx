import React from 'react';
import WelcomeHeader from './WelcomeHeader';
import RestaurantGraph from './RestaurantGraph';
import RecentActivity from './RecentActivity';
import RestaurantMap from './RestaurantMap';

interface OverviewContent {
  row1: React.ReactElement;
  row2: {
    left: React.ReactElement;
    right: React.ReactElement;
  };
  row3: React.ReactElement;
}

const getOverviewContent = (): OverviewContent => {
  return {
    row1: <WelcomeHeader />,
    row2: {
      left: <RestaurantGraph />,
      right: <RecentActivity />
    },
    row3: <RestaurantMap />
  };
};

export default getOverviewContent; 