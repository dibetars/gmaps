import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Overview from './Overview';
import Restaurants from './Restaurants';
import Earnings from './Earnings';
import AgentApprovals from './AgentApprovals';

const AgentLayout: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Overview />} />
      <Route path="/restaurants" element={<Restaurants />} />
      <Route path="/earnings" element={<Earnings />} />
      <Route path="/approvals" element={<AgentApprovals />} />
    </Routes>
  );
};

export default AgentLayout; 