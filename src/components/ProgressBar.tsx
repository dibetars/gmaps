import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  message?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total, message }) => {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="progress-container">
      {message && <p className="progress-message">{message}</p>}
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="progress-text">{current} of {total} places processed ({percentage}%)</p>
    </div>
  );
}; 