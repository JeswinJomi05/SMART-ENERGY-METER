import React, { useState } from 'react';
import { BarChart3 } from 'lucide-react';

export default function EnergyTrendChart() {
  const [activeRange, setActiveRange] = useState('Today');
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // 24H data points matching the screenshot visual spline
  const data24h = [
    { label: '12 AM', value: 4.5, time: '12:00 AM' },
    { label: '3 AM', value: 4.8, time: '03:00 AM' },
    { label: '6 AM', value: 8.2, time: '06:00 AM' },
    { label: '9 AM', value: 10.5, time: '09:00 AM' },
    { label: '12 PM', value: 7.2, time: '12:00 PM' },
    { label: '3 PM', value: 6.0, time: '03:00 PM' },
    { label: '6 PM', value: 10.4, time: '06:00 PM' },
    { label: '9 PM', value: 11.5, time: '09:00 PM' },
    { label: '12 AM', value: 12.8, time: '11:59 PM' },
  ];

  const data7d = [
    { label: 'Mon', value: 11.2, time: 'Monday' },
    { label: 'Tue', value: 14.5, time: 'Tuesday' },
    { label: 'Wed', value: 9.8, time: 'Wednesday' },
    { label: 'Thu', value: 15.6, time: 'Thursday' },
    { label: 'Fri', value: 13.4, time: 'Friday' },
    { label: 'Sat', value: 18.2, time: 'Saturday' },
    { label: 'Sun', value: 12.8, time: 'Sunday' },
  ];

  const currentData = activeRange === '7D' ? data7d : data24h;

  // Chart dimensions & scaling
  const width = 500;
  const height = 150;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 12;
  const paddingBottom = 26;
  const maxY = 20;

  const getX = (index) => {
    return paddingLeft + (index / (currentData.length - 1)) * (width - paddingLeft - paddingRight);
  };

  const getY = (val) => {
    const usableHeight = height - paddingTop - paddingBottom;
    return height - paddingBottom - (val / maxY) * usableHeight;
  };

  // Generate smooth SVG path (catmull-rom or bezier)
  const generateSmoothPath = (pts) => {
    if (pts.length === 0) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[0];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i != pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return path;
  };

  const points = currentData.map((d, i) => ({
    x: getX(i),
    y: getY(d.value),
    data: d,
    index: i,
  }));

  const linePath = generateSmoothPath(points);
  const areaPath = `${linePath} L ${getX(currentData.length - 1)} ${height - paddingBottom} L ${getX(0)} ${height - paddingBottom} Z`;

  const yTicks = [20, 15, 10, 5, 0];
  const xLabels = activeRange === 'Today' 
    ? [{ label: '12 AM', idx: 0 }, { label: '6 AM', idx: 2 }, { label: '12 PM', idx: 4 }, { label: '6 PM', idx: 6 }, { label: '12 AM', idx: 8 }]
    : currentData.map((d, i) => ({ label: d.label, idx: i }));

  return (
    <div className="info-card trend-chart-card">
      <div className="chart-header-row">
        <div className="info-card-header" style={{ marginBottom: 0 }}>
          <div className="info-card-header-icon blue">
            <BarChart3 size={15} />
          </div>
          <h3>Energy Usage Trend</h3>
        </div>

        <div className="chart-filters">
          <button 
            className={`filter-btn ${activeRange === 'Today' ? 'active' : ''}`}
            onClick={() => setActiveRange('Today')}
          >
            Today
          </button>
          <button 
            className={`filter-btn ${activeRange === '7D' ? 'active' : ''}`}
            onClick={() => setActiveRange('7D')}
          >
            7D
          </button>
        </div>
      </div>

      <div className="chart-svg-container">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          style={{ width: '100%', height: '100%', overflow: 'visible' }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00b4d8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#00b4d8" stopOpacity="0.0" />
            </linearGradient>
            <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Horizontal Grid lines */}
          {yTicks.map((val) => {
            const yPos = getY(val);
            return (
              <g key={val}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={width - paddingRight}
                  y2={yPos}
                  stroke="rgba(255, 255, 255, 0.07)"
                  strokeWidth="1"
                  strokeDasharray={val === 0 ? "none" : "2,4"}
                />
                <text
                  x={paddingLeft - 8}
                  y={yPos + 4}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                  fontFamily="inherit"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#trendGradient)" />

          {/* Glowing spline line */}
          <path
            d={linePath}
            fill="none"
            stroke="#00b4d8"
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#lineGlow)"
          />

          {/* Data dot points */}
          {points.map((pt, i) => (
            <g key={i}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r="3.5"
                fill="#ffffff"
                stroke="#00b4d8"
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'r 0.2s' }}
                onMouseEnter={() => setHoveredPoint(pt)}
              />
              {/* Invisible larger hover hit area */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r="14"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredPoint(pt)}
              />
            </g>
          ))}

          {/* X Axis Labels */}
          {xLabels.map((lbl, i) => {
            const xPos = getX(lbl.idx);
            return (
              <text
                key={i}
                x={xPos}
                y={height - 6}
                fill="#8da2c0"
                fontSize="10.5"
                textAnchor="middle"
                fontWeight="500"
                fontFamily="inherit"
              >
                {lbl.label}
              </text>
            );
          })}

          {/* Active Hover Guide & Tooltip */}
          {hoveredPoint && (
            <g>
              <line
                x1={hoveredPoint.x}
                y1={paddingTop}
                x2={hoveredPoint.x}
                y2={height - paddingBottom}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.8"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="5.5"
                fill="#ffffff"
                stroke="#00b4d8"
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>

        {hoveredPoint && (
          <div
            style={{
              position: 'absolute',
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
              transform: 'translate(-50%, -125%)',
              background: 'rgba(11, 20, 44, 0.95)',
              border: '1px solid #00b4d8',
              borderRadius: '6px',
              padding: '4px 8px',
              color: '#fff',
              fontSize: '11px',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
              zIndex: 10,
            }}
          >
            <div style={{ fontWeight: 600, color: '#38bdf8' }}>{hoveredPoint.data.time}</div>
            <div>Usage: {hoveredPoint.data.value} kWh</div>
          </div>
        )}
      </div>
    </div>
  );
}
