import React from 'react';
import '../styles/ProgressCard.css'; // Create this CSS file

interface ProgressCardProps {
  title: string;
  value: number;
  percentage: number;
}

export const ProgressCard: React.FC<ProgressCardProps> = ({ title, value, percentage }) => {
  // Calculate the stroke-dashoffset for the circle progress
  const circumference = 2 * Math.PI * 45; // 45 is the radius (r attribute)
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="progress-card">
      <div className="progress-circle-container">
        <svg className="progress-circle-svg" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            className="progress-circle-bg"
            cx="50"
            cy="50"
            r="45"
          />
          {/* Progress circle */}
          <circle
            className="progress-circle-progress"
            cx="50"
            cy="50"
            r="45"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
          {/* Percentage text */}
          <text
            className="progress-circle-text"
            x="50%"
            y="50%"
            dominantBaseline="middle"
            textAnchor="middle"
          >
            {percentage}%
          </text>
        </svg>
      </div>
      <div className="progress-card-info">
        <span className="progress-card-title">{title}</span>
        <span className="progress-card-value">{value.toLocaleString()}</span>
      </div>
    </div>
  );
};