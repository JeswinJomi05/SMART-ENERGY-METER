import React from 'react';
import { Wifi, Smartphone, Monitor } from 'lucide-react';

export default function TopHeader({
  deviceConnected = true,
  formattedDate = 'Sep 17, 2025',
  formattedTime = '03:24 PM',
  isMobilePreview,
  setIsMobilePreview,
}) {
  return (
    <header className="top-header">
      <div className="header-greeting">
        <h2>Good Morning!</h2>
        <p>Here's your energy usage overview</p>
      </div>

      <div className="header-meta">
        {/* Device preview switch for desktop users */}
        <button
          className="control-btn"
          onClick={() => setIsMobilePreview(!isMobilePreview)}
          title="Toggle Mobile/Desktop Layout Preview"
        >
          {isMobilePreview ? <Monitor size={14} /> : <Smartphone size={14} />}
          <span>{isMobilePreview ? 'Desktop View' : 'Mobile View'}</span>
        </button>

        {/* ESP32 Connection Status */}
        <div className="meta-status-chip">
          <div className="wifi-icon-wrapper">
            <Wifi size={20} />
          </div>
          <div className="status-details">
            <div className="status-state">
              {deviceConnected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="status-device">
              {deviceConnected ? 'ESP32 Online' : 'ESP32 Offline'}
            </div>
          </div>
        </div>

        <div className="header-meta-divider" />

        {/* Date & Time */}
        <div className="meta-datetime">
          <div className="meta-date">{formattedDate}</div>
          <div className="meta-time">{formattedTime}</div>
        </div>
      </div>
    </header>
  );
}
