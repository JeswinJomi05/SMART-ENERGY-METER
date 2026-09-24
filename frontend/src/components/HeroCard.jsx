import React from 'react';
import { Wallet, Zap, Leaf } from 'lucide-react';

export default function HeroCard({
  totalCost = '102.40',
  power = '1,955',
  energyUsed = '12.8',
}) {
  return (
    <div className="hero-cost-card">
      {/* Decorative Wave SVG in background */}
      <svg
        className="hero-bg-waves"
        viewBox="0 0 1000 200"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,100 C150,160 350,40 500,100 C650,160 850,50 1000,90 L1000,200 L0,200 Z"
          fill="rgba(56, 189, 248, 0.08)"
        />
        <path
          d="M0,80 C200,130 400,20 600,80 C800,140 900,40 1000,70"
          fill="none"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="1.5"
        />
        <path
          d="M0,120 C180,60 380,150 580,100 C780,50 900,120 1000,100"
          fill="none"
          stroke="rgba(56, 189, 248, 0.2)"
          strokeWidth="1.2"
          strokeDasharray="4,4"
        />
      </svg>

      {/* Left Cost Section */}
      <div className="hero-left-section">
        <div className="wallet-badge-icon">
          <Wallet size={26} />
        </div>
        <div className="hero-cost-info">
          <h4>Total Electricity Cost</h4>
          <div className="hero-cost-value">
            <span className="currency-symbol">₹</span>
            <span className="amount-number">{totalCost}</span>
            <span className="unit-period">today</span>
          </div>
        </div>
      </div>

      {/* Center Floating Bolt for Desktop */}
      <div className="hero-center-badge">
        <div className="floating-bolt-glow">
          <Zap size={26} fill="white" strokeWidth={1} />
        </div>
      </div>

      {/* Mobile House Graphic */}
      <div className="hero-mobile-house">
        <svg width="60" height="46" viewBox="0 0 68 52" fill="none">
          <path d="M34 6L54 22H14L34 6Z" fill="#1e3a8a" opacity="0.8" />
          <rect x="20" y="22" width="28" height="24" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1" />
          <rect x="30" y="32" width="8" height="14" fill="#1e293b" />
          <rect x="38" y="26" width="6" height="6" rx="1" fill="#38bdf8" opacity="0.4" />
          <path d="M34 2L30 14H36L32 24L42 12H35L38 2H34Z" fill="#38bdf8" />
        </svg>
      </div>

      <div className="hero-divider-line" />

      {/* Right Metrics Column (Desktop) / Bottom Row (Mobile) */}
      <div className="hero-right-metrics">
        <div className="hero-metric-item">
          <div className="hero-metric-icon-wrap power">
            <Zap size={18} fill="#f59e0b" />
          </div>
          <div className="hero-metric-texts">
            <div className="metric-label">Power</div>
            <div className="metric-val">{power} W</div>
          </div>
        </div>

        <div className="hero-metrics-divider" />

        <div className="hero-metric-item">
          <div className="hero-metric-icon-wrap energy">
            <Leaf size={18} fill="#10b981" />
          </div>
          <div className="hero-metric-texts">
            <div className="metric-label">Energy Used</div>
            <div className="metric-val">{energyUsed} kWh</div>
          </div>
        </div>
      </div>
    </div>
  );
}

