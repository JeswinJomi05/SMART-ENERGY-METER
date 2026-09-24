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
import { BACKEND_URL, API_BASE, getSocketTarget } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [isLiveSimulating, setIsLiveSimulating] = useState(false); // Default to FALSE so real ESP32 readings are used
  const [simulationMode, setSimulationMode] = useState('normal'); // 'normal' | 'exact' | 'overload'
  const [dataSource, setDataSource] = useState('esp32'); // 'esp32' | 'simulated'
  const [espDevice, setEspDevice] = useState(null);
  const [isPollingEsp, setIsPollingEsp] = useState(false);
  const [pollError, setPollError] = useState(null);
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [lastPacketTime, setLastPacketTime] = useState(null);

  // Meter configuration state
  const [tariffRate, setTariffRate] = useState(8.00);
  const [relayState, setRelayState] = useState(true); // Power ON / Tripped
  const [highVoltageLimit, setHighVoltageLimit] = useState(260);
  const [maxPowerLimit, setMaxPowerLimit] = useState(5000);

  // Live Parameters state - initialized with 0 until ESP32 data arrives
  const [voltage, setVoltage] = useState(228);
  const [current, setCurrent] = useState(0.0);
  const [power, setPower] = useState(0);
  const [energyUsed, setEnergyUsed] = useState(0.0);
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Dynamic cost calculation based on current energyUsed & tariffRate
  const totalCost = (energyUsed * tariffRate).toFixed(2);

  // Seconds counter since last packet
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Connect to MERN Backend via Socket.IO (if backend URL is configured)
  useEffect(() => {
    let socket;
    const socketTarget = getSocketTarget();

    if (socketTarget) {
      try {
        socket = io(socketTarget, {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 15,
          reconnectionDelay: 2000,
        });

        socket.on('connect', () => {
          console.log('[MERN Socket.IO] Connected to backend at', socketTarget);
          setIsWsConnected(true);
          setBackendConnected(true);
        });

        socket.on('disconnect', () => {
          console.log('[MERN Socket.IO] Disconnected from backend');
          setIsWsConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.warn('[Socket.IO] Connection error (retrying):', err.message);
          setIsWsConnected(false);
        });

        // Receive real-time telemetry from ESP32 via backend
        socket.on('telemetry:live', (data) => {
          if (data && data.reading) {
            const r = data.reading;
            setVoltage(typeof r.voltage === 'number' ? Number(r.voltage.toFixed(1)) : parseFloat(r.voltage) || 0);
            setCurrent(typeof r.current === 'number' ? Number(r.current.toFixed(3)) : parseFloat(r.current) || 0);
            setPower(typeof r.power === 'number' ? Number(r.power.toFixed(1)) : parseFloat(r.power) || 0);
            setEnergyUsed(typeof r.energy === 'number' ? Number(r.energy.toFixed(4)) : parseFloat(r.energy) || 0);
            setSecondsAgo(0);
            setLastPacketTime(new Date());

            if (data.tariffRate) setTariffRate(data.tariffRate);
            if (data.deviceStatus) {
              setEspDevice(data.deviceStatus);
              if (data.deviceStatus.relayState !== undefined) {
                setRelayState(data.deviceStatus.relayState);
              }
            }

            if (r.isSimulated) {
              setDataSource('simulated');
            } else {
              setDataSource('esp32');
              setIsLiveSimulating(false);
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
        console.warn('[Socket.IO] Initialization error:', e);
      }
    } else {
      console.info('[App] WebSocket to static host skipped. Real-time updates active via HTTP polling.');
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  // HTTP Polling fallback: polls /api/telemetry/live every 3s when Socket.IO is inactive
  useEffect(() => {
    let timer;

    const fetchLiveState = async () => {
      try {
        const res = await fetch(`${API_BASE}/telemetry/live`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          if (d.voltage !== undefined) setVoltage(Number(Number(d.voltage).toFixed(1)));
          if (d.current !== undefined) setCurrent(Number(Number(d.current).toFixed(3)));
          if (d.power !== undefined) setPower(Number(Number(d.power).toFixed(1)));
          if (d.energy !== undefined) setEnergyUsed(Number(Number(d.energy).toFixed(4)));
          if (d.tariffRate) setTariffRate(d.tariffRate);
          if (d.relayState !== undefined) setRelayState(d.relayState);
          setSecondsAgo(0);
          setLastPacketTime(new Date());
          setBackendConnected(true);
        }
      } catch (err) {
        if (!isWsConnected) {
          setBackendConnected(false);
        }
      }
    };

    fetchLiveState();

    // If WebSocket is not connected, keep polling every 3 seconds
    if (!isWsConnected) {
      timer = setInterval(fetchLiveState, 3000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isWsConnected]);

  // Poll ESP32 directly via backend
  const handlePollEsp32 = async () => {
    setIsPollingEsp(true);
    setPollError(null);
    try {
      const espIp = espDevice?.ipAddress || '192.168.1.145';
      const res = await fetch(`${API_BASE}/device/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: espIp }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to poll ESP32');
      setSecondsAgo(0);
      setDataSource('esp32');
      setIsLiveSimulating(false);
    } catch (err) {
      console.warn('[Poll ESP32] Error:', err.message);
      setPollError(err.message);
    } finally {
      setIsPollingEsp(false);
    }
  };

  // Live simulation tick engine - ONLY runs if user explicitly toggled simulation ON
  useEffect(() => {
    let timer;
    if (isLiveSimulating && relayState) {
      timer = setInterval(() => {
        setSecondsAgo(0);
        if (simulationMode === 'normal') {
          const newV = Math.round(227 + (Math.random() * 3 - 1));
          const newA = parseFloat((8.3 + (Math.random() * 0.3 - 0.1)).toFixed(1));
          const calculatedPower = Math.round(newV * newA * 0.98);

          fetch(`${API_BASE}/telemetry/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'normal' }),
          }).catch(() => {});

          setVoltage(newV);
          setCurrent(newA);
          setPower(calculatedPower);
          setEnergyUsed((prevKwh) => parseFloat((prevKwh + 0.001).toFixed(3)));
        } else if (simulationMode === 'overload') {
          const newV = 222;
          const newA = 19.4;
          const calculatedPower = Math.round(newV * newA * 0.97);

          fetch(`${API_BASE}/telemetry/simulate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'overload' }),
          }).catch(() => {});

          setVoltage(newV);
          setCurrent(newA);
          setPower(calculatedPower);
          setEnergyUsed((prevKwh) => parseFloat((prevKwh + 0.005).toFixed(3)));
        } else {
          setVoltage(228);
          setCurrent(8.4);
          setPower(1955);
          setEnergyUsed(12.8);
        }
      }, 3000);
    }

    return () => clearInterval(timer);
  }, [isLiveSimulating, simulationMode, relayState]);

  // Handle Relay Cut-off effect & synchronize with backend
  const handleToggleRelay = async (newState) => {
    setRelayState(newState);
    try {
      await fetch(`${API_BASE}/device/relay`, {
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
      await fetch(`${API_BASE}/settings`, {
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
    <div className="app-container">
      {/* Left Sidebar (Desktop Only) */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Mobile Top Bar (Visible only in mobile view <= 768px) */}
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

        {/* Desktop Top Header */}
        <TopHeader
          deviceConnected={relayState}
          formattedDate="Sep 17, 2025"
          formattedTime="03:24 PM"
        />

        {/* Conditional View Rendering */}
        {activeTab === 'Dashboard' && (
          <>
            {/* Total Electricity Cost Hero Banner */}
            <HeroCard
              totalCost={totalCost}
              power={power.toLocaleString()}
              energyUsed={energyUsed < 1 && energyUsed > 0 ? energyUsed.toFixed(3) : energyUsed.toFixed(2)}
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
              <div className="gauges-grid">
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
                <GaugeCard
                  title="Current"
                  type="current"
                  icon={<Activity size={18} />}
                  value={current < 1 && current > 0 ? current.toFixed(3) : current.toFixed(2)}
                  unit="A"
                  percentage={currentPercent}
                  maxReference="(of 30 A)"
                  color="#00e599"
                />
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
                  value={energyUsed < 1 && energyUsed > 0 ? energyUsed.toFixed(3) : energyUsed.toFixed(2)}
                  unit="kWh"
                  percentage={energyPercent}
                  maxReference="(of 50 kWh)"
                  color="#d946ef"
                />
              </div>
            </section>

            {/* Bottom 3 Cards Row */}
            <section className="bottom-cards-grid">
              <DeviceStatusCard
                isConnected={backendConnected && relayState}
                lastUpdatedSeconds={secondsAgo}
                autoRefresh={!isLiveSimulating}
                onRefresh={handlePollEsp32}
                onPoll={handlePollEsp32}
                isPolling={isPollingEsp}
                espDevice={espDevice}
                dataSource={dataSource}
              />
              <EnergyTrendChart />
              <QuickInfoCard
                tariffRate={tariffRate.toFixed(2)}
                totalCost={totalCost}
                energyUsed={energyUsed < 1 && energyUsed > 0 ? energyUsed.toFixed(3) : energyUsed.toFixed(2)}
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
  );
}
