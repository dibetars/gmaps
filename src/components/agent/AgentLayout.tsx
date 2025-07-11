import React from 'react';

interface AgentLayoutProps {
  children: React.ReactNode;
}

const AgentLayout: React.FC<AgentLayoutProps> = ({ children }) => {
  return (
    <div className="agent-layout">
      {children}
    </div>
  );
};

export default AgentLayout; 