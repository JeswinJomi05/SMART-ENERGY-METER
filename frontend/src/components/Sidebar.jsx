import React from 'react';
import { Home, History, Settings, LogOut, Zap } from 'lucide-react';
import HouseIllustration from './HouseIllustration';

export default function Sidebar({ activeTab, onSelectTab }) {
  return (
    <aside className="sidebar">
      <div>
        {/* Brand Header */}
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Zap size={22} fill="white" />
          </div>
          <div className="brand-text">
            <h1>Smart Energy Meter</h1>
            <span>IoT Powered</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="nav-menu">
          <button
            className={`nav-item ${activeTab === 'Dashboard' ? 'active' : ''}`}
            onClick={() => onSelectTab('Dashboard')}
          >
            <Home size={19} />
            <span>Dashboard</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'History' ? 'active' : ''}`}
            onClick={() => onSelectTab('History')}
          >
            <History size={19} />
            <span>History</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'Settings' ? 'active' : ''}`}
            onClick={() => onSelectTab('Settings')}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <button
            className="nav-item"
            onClick={() => {
              if (window.confirm('Simulate Logout from Smart Energy Meter?')) {
                onSelectTab('Dashboard');
              }
            }}
          >
            <LogOut size={19} />
            <span>Logout</span>
          </button>
        </nav>
      </div>

      {/* Sidebar Footer Artwork Card */}
      <div className="sidebar-footer-card">
        <HouseIllustration />
        <p className="tagline-top">Smarter Energy</p>
        <p className="tagline-bottom">Brighter Tomorrow</p>
      </div>
    </aside>
  );
}
