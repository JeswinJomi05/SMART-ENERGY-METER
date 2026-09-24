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
    <div className="info-card">
      <div className="info-card-header">
        <div className={`info-card-header-icon ${isEsp32Live ? 'green' : isConnected ? 'blue' : 'orange'}`}>
          <CheckCircle2 size={16} />
        </div>
        <h3>Device Status</h3>
        <span style={{
          marginLeft: 'auto',
          fontSize: '11px',
          fontWeight: 600,
          padding: '2px 8px',
          borderRadius: '12px',
          background: isEsp32Live ? 'rgba(16, 185, 129, 0.15)' : 'rgba(56, 189, 248, 0.15)',
          color: isEsp32Live ? '#10b981' : '#38bdf8',
          border: `1px solid ${isEsp32Live ? '#10b981' : '#38bdf8'}`,
        }}>
          {isEsp32Live ? 'ESP32 HARDWARE' : 'SIMULATION'}
        </span>
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
                ? `ESP32 (${ipAddress})`
                : isConnected
                ? 'Backend Connected'
                : 'ESP32 Disconnected'}
            </div>
          </div>
        </div>

        {/* Status Item 2: Last Update */}
        <div
          className="status-block"
          style={{ cursor: onPoll ? 'pointer' : 'default' }}
          onClick={onPoll || onRefresh}
          title={onPoll ? 'Click to poll ESP32 now' : 'Click to refresh'}
        >
          <div className="status-icon-badge">
            <RotateCw size={14} className={isPolling ? 'animate-spin' : ''} />
          </div>
          <div className="status-info-col">
            <div className="status-title-label">Last ESP32 Packet</div>
            <div className="status-val-highlight white">
              {lastUpdatedSeconds}s ago
            </div>
            <div className="status-sub-desc">
              {isPolling ? 'Polling ESP32...' : onPoll ? 'Click to poll now' : 'Auto updates every 3s'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
