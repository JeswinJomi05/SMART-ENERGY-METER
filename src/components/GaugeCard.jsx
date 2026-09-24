import React from 'react';

export default function GaugeCard({
  title,
  icon,
  type = 'voltage',
  value,
  unit,
  percentage,
  maxReference,
  color,
}) {
  const radius = 64;
  const strokeWidth = 11;
  const circumference = 2 * Math.PI * radius;
  // Arc calculation: offset according to percentage
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="gauge-card">
      <div className="gauge-card-header">
        <div className={`gauge-header-icon-wrap ${type}`}>
          {icon}
        </div>
        <span className="gauge-card-title">{title}</span>
      </div>

      <div className="gauge-visual-container">
        <svg className="gauge-svg" viewBox="0 0 160 160">
          <defs>
            <filter id={`glow-${type}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Background circle track */}
          <circle
            className="gauge-track"
            cx="80"
            cy="80"
            r={radius}
            strokeWidth={strokeWidth}
          />

          {/* Progress circle */}
          <circle
            className="gauge-progress"
            cx="80"
            cy="80"
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            filter={`url(#glow-${type})`}
          />
        </svg>

        <div className="gauge-center-content">
          <span className="gauge-main-value">{value}</span>
          <span className="gauge-sub-unit">{unit}</span>
        </div>
      </div>

      <div className="gauge-card-footer">
        <span className={`gauge-percentage ${type}`}>{percentage}%</span>
        <span className="gauge-max-ref">{maxReference}</span>
      </div>
    </div>
  );
}
