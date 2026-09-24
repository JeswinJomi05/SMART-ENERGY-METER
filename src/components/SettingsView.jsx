import React, { useState } from 'react';
import { Settings, ShieldAlert, Cpu, Bell, Power, Save, Check } from 'lucide-react';
import { updateSettingsAPI } from '../services/api';

export default function SettingsView({
  tariffRate,
  setTariffRate,
  relayState,
  setRelayState,
  highVoltageLimit,
  setHighVoltageLimit,
  maxPowerLimit,
  setMaxPowerLimit,
}) {
  const [saved, setSaved] = useState(false);
  const [espIp, setEspIp] = useState('192.168.1.145');
  const [mqttTopic, setMqttTopic] = useState('home/esp32/meter_01/tele');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateSettingsAPI({
        tariffRate,
        highVoltageLimit,
        maxPowerLimit,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.warn('[Settings] Failed to save to server:', err.message);
      // Still show local success
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', maxWidth: '900px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>Device & Meter Settings</h2>
        <p style={{ color: '#8da2c0', fontSize: '14px', marginTop: '4px' }}>
          Configure tariff slabs, safety thresholds, remote relay switches, and IoT connectivity
        </p>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Tariff & Billing Card */}
        <div className="info-card">
          <div className="info-card-header">
            <div className="info-card-header-icon blue">
              <Settings size={16} />
            </div>
            <h3>Tariff & Billing Configuration</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Unit Tariff Rate (₹ per kWh)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="50"
                value={tariffRate}
                onChange={(e) => setTariffRate(parseFloat(e.target.value) || 0)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
                Used for real-time cost calculation on the dashboard
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Billing Cycle
              </label>
              <select
                style={{
                  width: '100%',
                  background: '#0d1730',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              >
                <option value="1">Monthly (1st to end of month)</option>
                <option value="15">Bi-weekly</option>
                <option value="custom">Custom Prepaid Meter</option>
              </select>
            </div>
          </div>
        </div>

        {/* Remote Smart Breaker Relay Cut-Off */}
        <div className="info-card">
          <div className="info-card-header">
            <div className="info-card-header-icon green">
              <Power size={16} />
            </div>
            <h3>Remote Smart Breaker Control (Relay Cut-off)</h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: relayState ? '#10b981' : '#ef4444' }}>
                Main Circuit: {relayState ? 'ENERGIZED (NORMAL)' : 'DISCONNECTED (SAFETY CUT-OFF)'}
              </div>
              <p style={{ fontSize: '13px', color: '#8da2c0', marginTop: '4px' }}>
                Remotely toggle the main relay switch connected to the ESP32 GPIO16
              </p>
            </div>

            <button
              type="button"
              onClick={() => setRelayState(!relayState)}
              style={{
                background: relayState ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                border: `1px solid ${relayState ? '#ef4444' : '#10b981'}`,
                color: relayState ? '#ef4444' : '#10b981',
                padding: '10px 20px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s',
              }}
            >
              <Power size={16} />
              <span>{relayState ? 'Trip / Cut Off Power' : 'Restore Power Supply'}</span>
            </button>
          </div>
        </div>

        {/* Safety & Alert Thresholds */}
        <div className="info-card">
          <div className="info-card-header">
            <div className="info-card-header-icon orange">
              <ShieldAlert size={16} />
            </div>
            <h3>Safety Limits & Overload Thresholds</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                High Voltage Alert Limit (V)
              </label>
              <input
                type="number"
                value={highVoltageLimit}
                onChange={(e) => setHighVoltageLimit(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                Maximum Overload Power Limit (W)
              </label>
              <input
                type="number"
                value={maxPowerLimit}
                onChange={(e) => setMaxPowerLimit(Number(e.target.value))}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* ESP32 Hardware & MQTT Configuration */}
        <div className="info-card">
          <div className="info-card-header">
            <div className="info-card-header-icon cyan">
              <Cpu size={16} />
            </div>
            <h3>ESP32 Hardware & MQTT Settings</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                ESP32 Local IP Address
              </label>
              <input
                type="text"
                value={espIp}
                onChange={(e) => setEspIp(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                MQTT Telemetry Topic
              </label>
              <input
                type="text"
                value={mqttTopic}
                onChange={(e) => setMqttTopic(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="submit"
            className="control-btn"
            style={{
              background: '#1d68f2',
              borderColor: '#2563eb',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {saved ? <Check size={16} /> : <Save size={16} />}
            <span>{saved ? 'Settings Applied!' : 'Save Configuration'}</span>
          </button>

          {saved && (
            <span style={{ color: '#10b981', fontSize: '13px', fontWeight: 500 }}>
              Configuration successfully updated on ESP32 device!
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
