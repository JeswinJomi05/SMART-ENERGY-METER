import React from 'react';
import { CheckCircle2, RotateCw } from 'lucide-react';

export default function DeviceStatusCard({
  isConnected = true,
  lastUpdatedSeconds = 0,
  autoRefresh = false,
  onRefresh,
  espDevice = null,
  dataSource = 'esp32',
  onPoll,
  isPolling = false,
}) {
  const isEsp32Live = dataSource === 'esp32' && isConnected;
  const ipAddress = espDevice?.ipAddress || '192.168.1.x';

  return (
    <div className="info-card device-status-card">
      <div className="info-card-header">
        <div className="info-card-header-icon green">
          <CheckCircle2 size={16} />
        </div>
        <h3>Device Status</h3>
      </div>

      <div className="device-status-content">
        {/* Status Item 1: Meter Status */}
        <div className="status-block">
          <div className={`status-dot-indicator ${isEsp32Live ? 'pulse-green' : ''}`} />
          <div className="status-info-col">
            <div className="status-title-label">Meter Status</div>
            <div className={`status-val-highlight ${isEsp32Live ? 'green' : 'white'}`}>
              {isConnected ? 'Online' : 'Offline'}
            </div>
            <div className="status-sub-desc">
              {isEsp32Live
                ? `ESP32 Connected`
                : isConnected
                ? 'Backend Connected'
                : 'ESP32 Disconnected'}
            </div>
          </div>
        </div>

        {/* Status Item 2: Last Update */}
        <div
          className="status-block clickable-update"
          onClick={onPoll || onRefresh}
          title="Click to poll ESP32 now"
        >
          <div className="status-icon-badge">
            <RotateCw size={13} className={isPolling ? 'animate-spin' : ''} />
          </div>
          <div className="status-info-col">
            <div className="status-title-label">Last Update</div>
            <div className="status-val-highlight white">
              {lastUpdatedSeconds}s ago
            </div>
            <div className="status-sub-desc">
              Auto refresh enabled
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
