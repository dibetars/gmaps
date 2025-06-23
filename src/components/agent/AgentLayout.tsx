import React from 'react';

interface AgentLayoutProps {
  row1?: React.ReactNode;
  row2?: {
    left?: React.ReactNode;
    right?: React.ReactNode;
  };
  row3?: React.ReactNode;
  children?: React.ReactNode;
}

const AgentLayout: React.FC<AgentLayoutProps> = ({ row1, row2, row3, children }) => {
  return (
    <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Row 1: One column */}
      <div style={{ marginBottom: '24px' }}>
        {row1 || <div style={{ color: '#6b7280' }}>Row 1 content (empty for now)</div>}
      </div>
      
      {/* Row 2: Two columns */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '24px', 
        marginBottom: '24px' 
      }}>
        <div>
          {row2?.left || <div style={{ color: '#6b7280' }}>Row 2, Col 1 content (empty for now)</div>}
        </div>
        <div>
          {row2?.right || <div style={{ color: '#6b7280' }}>Row 2, Col 2 content (empty for now)</div>}
        </div>
      </div>
      
      {/* Row 3: One column */}
      <div>
        {row3 || <div style={{ color: '#6b7280' }}>Row 3 content (empty for now)</div>}
      </div>
      
      {children}
    </div>
  );
};

export default AgentLayout; 