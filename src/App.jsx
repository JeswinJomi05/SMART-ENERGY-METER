import React, { useState, useEffect } from 'react';
import {
  Zap,
  Activity,
  Play,
  Pause,
  AlertTriangle,
  RotateCcw,
  Smartphone,
  Monitor,
  Server,
} from 'lucide-react';
import { io } from 'socket.io-client';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import HeroCard from './components/HeroCard';
import GaugeCard from './components/GaugeCard';
import DeviceStatusCard from './components/DeviceStatusCard';
import EnergyTrendChart from './components/EnergyTrendChart';
import QuickInfoCard from './components/QuickInfoCard';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import ProfileView from './components/ProfileView';
import MobileBottomNav from './components/MobileBottomNav';

const BACKEND_URL = window.location.hostname === 'localhost' && window.location.port === '3000' ? '' : 'http://localhost:5000';

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isLiveSimulating, setIsLiveSimulating] = useState(true);
  const [simulationMode, setSimulationMode] = useState('normal'); // 'normal' | 'exact' | 'overload'
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [lastPacketTime, setLastPacketTime] = useState(null);

  // Meter configuration state
  const [tariffRate, setTariffRate] = useState(8.00);
  const [relayState, setRelayState] = useState(true); // Power ON / Tripped
  const [highVoltageLimit, setHighVoltageLimit] = useState(260);
  const [maxPowerLimit, setMaxPowerLimit] = useState(5000);

  // Live Parameters state (default matches the screenshot exactly)
  const [voltage, setVoltage] = useState(228);
  const [current, setCurrent] = useState(8.4);
  const [power, setPower] = useState(1955);
  const [energyUsed, setEnergyUsed] = useState(12.8);
  const [secondsAgo, setSecondsAgo] = useState(2);

  // Dynamic cost calculation based on current energyUsed & tariffRate
  const totalCost = (energyUsed * tariffRate).toFixed(2);

  // Connect to MERN Backend via Socket.IO
  useEffect(() => {
    let socket;
    try {
      socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      socket.on('connect', () => {
        console.log('[MERN Socket.IO] Connected to backend on port 5000');
        setBackendConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('[MERN Socket.IO] Disconnected from backend');
        setBackendConnected(false);
      });

      // Receive real-time telemetry from ESP32 via backend
      socket.on('telemetry:live', (data) => {
        if (data && data.reading) {
          const r = data.reading;
          setVoltage(Math.round(r.voltage));
          setCurrent(parseFloat(r.current.toFixed(1)));
          setPower(Math.round(r.power));
          setEnergyUsed(parseFloat(r.energy.toFixed(1)));
          setSecondsAgo(0);
          if (data.tariffRate) setTariffRate(data.tariffRate);
          if (data.deviceStatus && data.deviceStatus.relayState !== undefined) {
            setRelayState(data.deviceStatus.relayState);
          }
        }
      });

      // Receive remote relay switch events
      socket.on('device:relay', (data) => {
        if (data && data.relayState !== undefined) {
          setRelayState(data.relayState);
        }
      });
    } catch (e) {
      console.warn('[Socket.IO] Connection error:', e);
    }

    // Fetch initial state from backend REST API
    fetch(`${BACKEND_URL}/api/telemetry/live`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const d = json.data;
          setVoltage(Math.round(d.voltage));
          setCurrent(parseFloat(d.current.toFixed(1)));
          setPower(Math.round(d.power));
          setEnergyUsed(parseFloat(d.energy.toFixed(1)));
          if (d.tariffRate) setTariffRate(d.tariffRate);
          if (d.relayState !== undefined) setRelayState(d.relayState);
          setBackendConnected(true);
        }
      })
      .catch((err) => {
        console.log('[Backend] Using internal simulation engine');
      });

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // Live simulation tick engine (runs when backend simulation is enabled)
  useEffect(() => {
    let timer;
    if (isLiveSimulating && relayState) {
      timer = setInterval(() => {
        setSecondsAgo((prev) => {
          if (prev >= 4) {
            // Send pulse to backend if connected, or update state locally
            if (simulationMode === 'normal') {
              const newV = Math.round(227 + (Math.random() * 3 - 1));
              const newA = parseFloat((8.3 + (Math.random() * 0.3 - 0.1)).toFixed(1));
              const calculatedPower = Math.round(newV * newA * 0.98);

              // Notify backend simulator endpoint
              fetch(`${BACKEND_URL}/api/telemetry/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'normal' }),
              }).catch(() => {});

              setVoltage(newV);
              setCurrent(newA);
              setPower(calculatedPower);
              setEnergyUsed((prevKwh) => parseFloat((prevKwh + 0.001).toFixed(2)));
            } else if (simulationMode === 'overload') {
              const newV = 222;
              const newA = 19.4;
              const calculatedPower = Math.round(newV * newA * 0.97);

              fetch(`${BACKEND_URL}/api/telemetry/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'overload' }),
              }).catch(() => {});

              setVoltage(newV);
              setCurrent(newA);
              setPower(calculatedPower);
              setEnergyUsed((prevKwh) => parseFloat((prevKwh + 0.005).toFixed(2)));
            } else {
              setVoltage(228);
              setCurrent(8.4);
              setPower(1955);
              setEnergyUsed(12.8);
            }
            return 1;
          }
          return prev + 1;
        });
      }, 1000);
    }

    return () => clearInterval(timer);
  }, [isLiveSimulating, simulationMode, relayState]);

  // Handle Relay Cut-off effect & synchronize with backend
  const handleToggleRelay = async (newState) => {
    setRelayState(newState);
    try {
      await fetch(`${BACKEND_URL}/api/device/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relayState: newState }),
      });
    } catch (e) {
      console.warn('[Relay Toggle] Backend sync failed, updated locally');
    }
  };

  // Synchronize Settings with backend
  const handleUpdateTariff = async (newRate) => {
    setTariffRate(newRate);
    try {
      await fetch(`${BACKEND_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tariffRate: newRate }),
      });
    } catch (e) {
      console.warn('[Settings] Backend sync failed, updated locally');
    }
  };

  // Reset to screenshot exact baseline
  const resetToScreenshotValues = () => {
    setSimulationMode('exact');
    setVoltage(228);
    setCurrent(8.4);
    setPower(1955);
    setEnergyUsed(12.8);
    setSecondsAgo(2);
    handleToggleRelay(true);
  };

  // Percentage calculations
  const voltagePercent = Math.min(Math.round((voltage / highVoltageLimit) * 100), 100);
  const currentPercent = Math.min(Math.round((current / 30) * 100), 100);
  const powerPercent = Math.min(Math.round((power / maxPowerLimit) * 100), 100);
  const energyPercent = Math.min(Math.round((energyUsed / 50) * 100), 100);

  return (
    <div className={`app-container ${isMobilePreview ? 'preview-mode-wrapper' : ''}`}>
      {/* Mobile Device Frame Simulation Wrapper when preview toggle is on */}
      <div className={isMobilePreview ? 'phone-mockup-frame' : 'full-desktop-wrapper'}>
        {/* Left Sidebar (Desktop Only) */}
        {!isMobilePreview && (
          <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />
        )}

        {/* Main Content Area */}
        <main className="main-content">
          {/* Mobile Top Bar (Visible only in mobile view or when preview toggle is active) */}
          <div className="mobile-top-bar">
            <div className="mobile-brand">
              <div className="mobile-brand-icon">
                <Zap size={18} fill="white" />
              </div>
              <div className="mobile-brand-text">
                <h2>Smart Energy Meter</h2>
                <span>IoT Powered</span>
              </div>
            </div>

            <div className="mobile-status-badge">
              <div className="mobile-status-online">Online</div>
              <div className="mobile-status-sub">ESP32 Connected</div>
            </div>
          </div>

          {/* Desktop Top Header (Hidden on small screens) */}
          <TopHeader
            deviceConnected={relayState}
            formattedDate="Sep 17, 2025"
            formattedTime="03:24 PM"
            isMobilePreview={isMobilePreview}
            setIsMobilePreview={setIsMobilePreview}
          />

          {/* Interactive Simulation & Backend Controls floating bar */}
          <div className="control-bar">
            <div className="control-bar-left">
              <Activity size={16} color="#00b4d8" />
              <span>
                Backend:{' '}
                <strong style={{ color: backendConnected ? '#10b981' : '#f59e0b' }}>
                  {backendConnected ? 'Node/Express Live (Port 5000)' : 'Local Engine'}
                </strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className={`control-btn ${simulationMode === 'exact' ? 'active' : ''}`}
                onClick={resetToScreenshotValues}
                title="Lock values to exact screenshot numbers"
              >
                <RotateCcw size={13} />
                <span>Exact Image Match</span>
              </button>

              <button
                className={`control-btn ${simulationMode === 'normal' ? 'active' : ''}`}
                onClick={() => setSimulationMode('normal')}
                title="Enable natural live micro-fluctuations"
              >
                <span>Live Fluctuations</span>
              </button>

              <button
                className={`control-btn ${simulationMode === 'overload' ? 'active' : ''}`}
                onClick={() => setSimulationMode('overload')}
                title="Simulate high load scenario"
              >
                <AlertTriangle size={13} color="#f59e0b" />
                <span>High Load Demo</span>
              </button>

              <button
                className="control-btn"
                onClick={() => setIsLiveSimulating(!isLiveSimulating)}
              >
                {isLiveSimulating ? <Pause size={13} /> : <Play size={13} />}
                <span>{isLiveSimulating ? 'Pause' : 'Resume'}</span>
              </button>
            </div>
          </div>

          {/* Conditional View Rendering */}
          {activeTab === 'Dashboard' && (
            <>
              {/* Total Electricity Cost Hero Banner */}
              <HeroCard
                totalCost={totalCost}
                power={power.toLocaleString()}
                energyUsed={energyUsed.toFixed(1)}
              />

              {/* Live Parameters Section */}
              <section>
                <div className="section-header-row">
                  <div className="section-title">
                    <Activity size={20} />
                    <span>Live Parameters</span>
                  </div>

                  <div className="realtime-pill-badge">
                    <span className="realtime-dot" />
                    <span>Real-time</span>
                  </div>
                </div>

                {/* 4 Circular Radial Gauges */}
                <div className="gauges-grid" style={{ marginTop: '16px' }}>
                  {/* Gauge 1: Voltage */}
                  <GaugeCard
                    title="Voltage"
                    type="voltage"
                    icon={<Zap size={18} />}
                    value={voltage}
                    unit="V"
                    percentage={voltagePercent}
                    maxReference={`(of ${highVoltageLimit} V)`}
                    color="#00b4d8"
                  />

                  {/* Gauge 2: Current */}
                  <GaugeCard
                    title="Current"
                    type="current"
                    icon={<Activity size={18} />}
                    value={current.toFixed(1)}
                    unit="A"
                    percentage={currentPercent}
                    maxReference="(of 30 A)"
                    color="#00e599"
                  />

                  {/* Gauge 3: Power */}
                  <GaugeCard
                    title="Power"
                    type="power"
                    icon={<Zap size={18} />}
                    value={power.toLocaleString()}
                    unit="W"
                    percentage={powerPercent}
                    maxReference={`(of ${maxPowerLimit.toLocaleString()} W)`}
                    color="#ff9f1c"
                  />

                  {/* Gauge 4: Energy Used */}
                  <GaugeCard
                    title="Energy Used"
                    type="energy"
                    icon={
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <ellipse cx="12" cy="5" rx="9" ry="3"/>
                        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
                        <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
                      </svg>
                    }
                    value={energyUsed.toFixed(1)}
                    unit="kWh"
                    percentage={energyPercent}
                    maxReference="(of 50 kWh)"
                    color="#d946ef"
                  />
                </div>
              </section>

              {/* Bottom 3 Cards Row */}
              <section className="bottom-cards-grid">
                {/* 1. Device Status */}
                <DeviceStatusCard
                  isConnected={relayState}
                  lastUpdatedSeconds={secondsAgo}
                  autoRefresh={isLiveSimulating}
                  onRefresh={() => setSecondsAgo(0)}
                />

                {/* 2. Energy Usage Trend Chart */}
                <EnergyTrendChart />

                {/* 3. Quick Info Card */}
                <QuickInfoCard
                  tariffRate={tariffRate.toFixed(2)}
                  totalCost={totalCost}
                  energyUsed={energyUsed.toFixed(1)}
                  currentPower={power.toLocaleString()}
                />
              </section>
            </>
          )}

          {activeTab === 'History' && (
            <HistoryView tariffRate={tariffRate} />
          )}

          {activeTab === 'Settings' && (
            <SettingsView
              tariffRate={tariffRate}
              setTariffRate={handleUpdateTariff}
              relayState={relayState}
              setRelayState={handleToggleRelay}
              highVoltageLimit={highVoltageLimit}
              setHighVoltageLimit={setHighVoltageLimit}
              maxPowerLimit={maxPowerLimit}
              setMaxPowerLimit={setMaxPowerLimit}
            />
          )}

          {activeTab === 'Profile' && (
            <ProfileView />
          )}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <MobileBottomNav activeTab={activeTab} onSelectTab={setActiveTab} />
      </div>
    </div>
  );
}
