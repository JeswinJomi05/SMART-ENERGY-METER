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
          <Wallet size={28} />
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

      {/* Center Floating Bolt */}
      <div className="hero-center-badge">
        <div className="floating-bolt-glow">
          <Zap size={28} fill="white" strokeWidth={1} />
        </div>
      </div>

      {/* Right Metrics Column */}
      <div className="hero-right-metrics">
        <div className="hero-metric-item">
          <div className="hero-metric-icon-wrap power">
            <Zap size={20} fill="#f59e0b" />
          </div>
          <div className="hero-metric-texts">
            <div className="metric-label">Power</div>
            <div className="metric-val">{power} W</div>
          </div>
        </div>

        <div className="hero-metrics-divider" />

        <div className="hero-metric-item">
          <div className="hero-metric-icon-wrap energy">
            <Leaf size={20} fill="#10b981" />
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
