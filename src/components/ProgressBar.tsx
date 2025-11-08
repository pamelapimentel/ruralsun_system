import React from 'react';
import '../styles/ProgressBar.css'; // Create this CSS file

interface ProgressBarProps {
  percentage: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage }) => {
  // Ensure percentage is between 0 and 100
  const validPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div className="progress-bar-container">
      <div className="progress-bar-track">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${validPercentage}%` }} 
        />
      </div>
      <span className="progress-bar-text">{validPercentage}%</span>
    </div>
  );
};