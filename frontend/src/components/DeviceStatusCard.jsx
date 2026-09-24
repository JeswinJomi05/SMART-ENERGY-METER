import React from 'react';
import { CheckCircle2, RotateCw } from 'lucide-react';

export default function DeviceStatusCard({
  isConnected = true,
  lastUpdatedSeconds = 2,
  autoRefresh = true,
  onRefresh,
}) {
  return (
    <div className="info-card">
      <div className="info-card-header">
        <div className="info-card-header-icon green">
          <CheckCircle2 size={16} />
        </div>
        <h3>Device Status</h3>
      </div>

      <div className="device-status-content">
        {/* Status Item 1: Meter Status */}
        <div className="status-block">
          <div className="status-dot-indicator" />
          <div className="status-info-col">
            <div className="status-title-label">Meter Status</div>
            <div className="status-val-highlight green">
              {isConnected ? 'Online' : 'Offline'}
            </div>
            <div className="status-sub-desc">
              {isConnected ? 'ESP32 Connected' : 'ESP32 Disconnected'}
            </div>
          </div>
        </div>

        {/* Status Item 2: Last Update */}
        <div className="status-block" style={{ cursor: 'pointer' }} onClick={onRefresh} title="Click to manually refresh">
          <div className="status-icon-badge">
            <RotateCw size={14} />
          </div>
          <div className="status-info-col">
            <div className="status-title-label">Last Update</div>
            <div className="status-val-highlight white">
              {lastUpdatedSeconds}s ago
            </div>
            <div className="status-sub-desc">
              {autoRefresh ? 'Auto refresh enabled' : 'Auto refresh paused'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
