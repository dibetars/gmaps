import React from 'react';
import AgentLayout from '../../components/agent/AgentLayout';
import Overview from '../../components/agent/Overview';

const Dashboard: React.FC = () => {
  return (
    <AgentLayout>
      <Overview />
    </AgentLayout>
  );
};

export default Dashboard; 