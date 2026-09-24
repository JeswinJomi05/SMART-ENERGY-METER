import React from 'react';
import { Info, IndianRupee, Leaf, Zap } from 'lucide-react';

export default function QuickInfoCard({
  tariffRate = '8.00',
  totalCost = '102.40',
  energyUsed = '12.8',
  currentPower = '1,955',
}) {
  return (
    <div className="info-card">
      <div className="info-card-header">
        <div className="info-card-header-icon cyan">
          <Info size={16} />
        </div>
        <h3>Quick Info</h3>
      </div>

      <div className="quick-info-list">
        {/* Row 1: Tariff Rate */}
        <div className="quick-info-row">
          <div className="quick-info-left">
            <div className="quick-info-circle-icon blue">
              <IndianRupee size={14} />
            </div>
            <span className="quick-info-label">Tariff Rate</span>
          </div>
          <span className="quick-info-val">₹ {tariffRate} / kWh</span>
        </div>

        {/* Row 2: Total Cost (Today) */}
        <div className="quick-info-row">
          <div className="quick-info-left">
            <div className="quick-info-circle-icon blue">
              <IndianRupee size={14} />
            </div>
            <span className="quick-info-label">Total Cost (Today)</span>
          </div>
          <span className="quick-info-val">₹ {totalCost}</span>
        </div>

        {/* Row 3: Energy Used (Today) */}
        <div className="quick-info-row">
          <div className="quick-info-left">
            <div className="quick-info-circle-icon green">
              <Leaf size={14} />
            </div>
            <span className="quick-info-label">Energy Used (Today)</span>
          </div>
          <span className="quick-info-val">{energyUsed} kWh</span>
        </div>

        {/* Row 4: Power (Current) */}
        <div className="quick-info-row">
          <div className="quick-info-left">
            <div className="quick-info-circle-icon orange">
              <Zap size={14} />
            </div>
            <span className="quick-info-label">Power (Current)</span>
          </div>
          <span className="quick-info-val">{currentPower} W</span>
        </div>
      </div>
    </div>
  );
}
