import React from 'react';

export default function HouseIllustration() {
  return (
    <div className="sidebar-house-illustration">
      <svg width="150" height="90" viewBox="0 0 150 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="roofGrad" x1="20" y1="35" x2="75" y2="70" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="1" stopColor="#1e3a8a" />
          </linearGradient>
          <linearGradient id="wallGrad" x1="30" y1="45" x2="80" y2="85" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1e293b" />
            <stop offset="1" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="meterGrad" x1="105" y1="45" x2="125" y2="75" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="1" stopColor="#0284c7" />
          </linearGradient>
          <filter id="wifiGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient foliage / leaves */}
        <path d="M12 78C12 70 20 62 30 65C30 74 24 80 12 78Z" fill="#134e4a" opacity="0.6" />
        <path d="M22 80C22 72 32 64 42 68C42 77 34 82 22 80Z" fill="#0f766e" opacity="0.5" />
        <path d="M128 80C128 72 138 66 146 72C146 80 138 84 128 80Z" fill="#0f766e" opacity="0.5" />
        <path d="M116 82C116 75 125 70 132 75C132 82 124 85 116 82Z" fill="#134e4a" opacity="0.6" />

        {/* House Body */}
        <rect x="30" y="44" width="55" height="34" rx="3" fill="url(#wallGrad)" stroke="#38bdf8" strokeWidth="1.2" />

        {/* Chimney */}
        <rect x="38" y="30" width="8" height="15" rx="1.5" fill="#1e3a8a" />

        {/* Slanted Roof */}
        <polygon points="57.5,23 90,45 25,45" fill="url(#roofGrad)" />
        <line x1="23" y1="46" x2="92" y2="46" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />

        {/* Window */}
        <rect x="50" y="52" width="15" height="15" rx="2" fill="#38bdf8" opacity="0.25" stroke="#38bdf8" strokeWidth="1" />
        <line x1="57.5" y1="52" x2="57.5" y2="67" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />
        <line x1="50" y1="59.5" x2="65" y2="59.5" stroke="#38bdf8" strokeWidth="0.8" opacity="0.8" />

        {/* Connecting Cable from House to Meter */}
        <path d="M85 64 C95 64, 98 64, 104 64" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2,2" opacity="0.7" />

        {/* Smart Energy Meter Device */}
        <rect x="104" y="44" width="24" height="34" rx="4" fill="#0b1739" stroke="#38bdf8" strokeWidth="1.5" />
        {/* Meter Screen */}
        <rect x="108" y="49" width="16" height="11" rx="2" fill="#00b4d8" opacity="0.3" stroke="#00b4d8" strokeWidth="0.8" />
        <rect x="110" y="52" width="12" height="5" rx="1" fill="#38bdf8" />
        {/* Meter Dial / Button */}
        <circle cx="116" cy="69" r="3.5" fill="#38bdf8" opacity="0.6" stroke="#38bdf8" strokeWidth="1" />
        {/* Blinking Meter LED */}
        <circle cx="123" cy="47" r="1.5" fill="#10b981">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
        </circle>

        {/* Wi-Fi Radiation Waves above House Antenna */}
        {/* Tiny rooftop node */}
        <circle cx="57.5" cy="22" r="2" fill="#38bdf8" />
        
        {/* Wi-Fi Wave 1 */}
        <path
          d="M52 17 A8 8 0 0 1 63 17"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeLinecap="round"
          filter="url(#wifiGlow)"
        />
        {/* Wi-Fi Wave 2 */}
        <path
          d="M47 12 A15 15 0 0 1 68 12"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.85"
          filter="url(#wifiGlow)"
        />
        {/* Wi-Fi Wave 3 */}
        <path
          d="M42 7 A22 22 0 0 1 73 7"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
          filter="url(#wifiGlow)"
        />
      </svg>
    </div>
  );
}
