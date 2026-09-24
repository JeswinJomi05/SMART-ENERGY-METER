import React from 'react';
import { Home, BarChart2, Settings, User } from 'lucide-react';

export default function MobileBottomNav({ activeTab, onSelectTab }) {
  return (
    <nav className="mobile-bottom-nav">
      <button
        className={`mobile-nav-item ${activeTab === 'Dashboard' ? 'active' : ''}`}
        onClick={() => onSelectTab('Dashboard')}
      >
        <Home size={20} />
        <span>Home</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'History' ? 'active' : ''}`}
        onClick={() => onSelectTab('History')}
      >
        <BarChart2 size={20} />
        <span>History</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'Settings' ? 'active' : ''}`}
        onClick={() => onSelectTab('Settings')}
      >
        <Settings size={20} />
        <span>Settings</span>
      </button>

      <button
        className={`mobile-nav-item ${activeTab === 'Profile' ? 'active' : ''}`}
        onClick={() => onSelectTab('Profile')}
      >
        <User size={20} />
        <span>Profile</span>
      </button>
    </nav>
  );
}
