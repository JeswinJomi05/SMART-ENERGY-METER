import React, { useState, useEffect } from 'react';
import { Download, Calendar, Filter, PieChart, ArrowUpRight, RefreshCw } from 'lucide-react';
import { fetchHistory } from '../services/api';

export default function HistoryView({ tariffRate = 8.00 }) {
  const [selectedDate, setSelectedDate] = useState('2025-09-17');
  const [loading, setLoading] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([
    { time: '11:00 AM - 12:00 PM', voltage: 228, current: 8.4, power: 1955, energy: 1.95, cost: (1.95 * tariffRate).toFixed(2), peak: true },
    { time: '10:00 AM - 11:00 AM', voltage: 231, current: 7.9, power: 1824, energy: 1.82, cost: (1.82 * tariffRate).toFixed(2), peak: true },
    { time: '09:00 AM - 10:00 AM', voltage: 230, current: 9.1, power: 2093, energy: 2.09, cost: (2.09 * tariffRate).toFixed(2), peak: true },
    { time: '08:00 AM - 09:00 AM', voltage: 229, current: 6.5, power: 1488, energy: 1.48, cost: (1.48 * tariffRate).toFixed(2), peak: false },
    { time: '07:00 AM - 08:00 AM', voltage: 233, current: 4.2, power: 978, energy: 0.98, cost: (0.98 * tariffRate).toFixed(2), peak: false },
    { time: '06:00 AM - 07:00 AM', voltage: 234, current: 3.1, power: 725, energy: 0.73, cost: (0.73 * tariffRate).toFixed(2), peak: false },
    { time: '12:00 AM - 06:00 AM (Base)', voltage: 236, current: 1.6, power: 377, energy: 3.75, cost: (3.75 * tariffRate).toFixed(2), peak: false },
  ]);

  const loadBackendHistory = async () => {
    setLoading(true);
    try {
      const records = await fetchHistory(20);
      if (records && records.length > 0) {
        const formatted = records.map((r, i) => {
          const d = new Date(r.timestamp);
          const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          return {
            time: `${timeStr} (Packet #${records.length - i})`,
            voltage: Math.round(r.voltage),
            current: parseFloat(r.current.toFixed(1)),
            power: Math.round(r.power),
            energy: parseFloat(r.energy.toFixed(2)),
            cost: (r.energy * tariffRate).toFixed(2),
            peak: r.power > 2000,
          };
        });
        setHistoryLogs(formatted);
      }
    } catch (e) {
      console.warn('[HistoryView] Backend history fetch notice:', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackendHistory();
  }, [tariffRate]);

  const appliances = [
    { name: 'Air Conditioner (Inverter 1.5T)', share: 44, kwh: 5.63, color: '#00b4d8' },
    { name: 'Refrigerator (Frost Free)', share: 22, kwh: 2.81, color: '#00e599' },
    { name: 'EV 2-Wheeler Fast Charger', share: 18, kwh: 2.30, color: '#ff9f1c' },
    { name: 'Kitchen & Water Purifier', share: 10, kwh: 1.28, color: '#d946ef' },
    { name: 'Lighting & Smart Home Hubs', share: 6, kwh: 0.78, color: '#38bdf8' },
  ];

  const handleExportCSV = () => {
    const headers = 'Time Interval,Voltage (V),Current (A),Power (W),Energy (kWh),Cost (INR)\n';
    const rows = historyLogs
      .map(
        (log) =>
          `"${log.time}",${log.voltage},${log.current},${log.power},${log.energy},${log.cost}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `energy_meter_history_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>Historical Energy Logs</h2>
          <p style={{ color: '#8da2c0', fontSize: '14px', marginTop: '4px' }}>
            Detailed hourly power analysis, appliance breakdown, and cost records from MERN Database
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={loadBackendHistory}
            className="control-btn"
            style={{ padding: '8px 12px' }}
            title="Refresh database records"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Fetching...' : 'Reload DB'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="control-btn"
            style={{ background: '#1d68f2', borderColor: '#2563eb', padding: '8px 14px' }}
          >
            <Download size={15} />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Appliance Breakdown Card */}
      <div className="info-card">
        <div className="info-card-header">
          <div className="info-card-header-icon blue">
            <PieChart size={16} />
          </div>
          <h3>Estimated Load Distribution (Today)</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginTop: '4px' }}>
          {appliances.map((app) => (
            <div
              key={app.name}
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 500 }}>{app.name}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: app.color }}>{app.share}%</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${app.share}%`, height: '100%', background: app.color, borderRadius: '3px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#94a3b8' }}>
                <span>{app.kwh} kWh</span>
                <span>₹ {(app.kwh * tariffRate).toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Table */}
      <div className="info-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>Hourly Consumption Breakdown (Live Server Data)</h3>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            {historyLogs.length} Records Loaded
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', color: '#8da2c0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <th style={{ padding: '12px 24px' }}>Time Interval</th>
                <th style={{ padding: '12px 16px' }}>Voltage</th>
                <th style={{ padding: '12px 16px' }}>Current</th>
                <th style={{ padding: '12px 16px' }}>Active Power</th>
                <th style={{ padding: '12px 16px' }}>Energy (kWh)</th>
                <th style={{ padding: '12px 24px', textAlign: 'right' }}>Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {historyLogs.map((row, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    background: row.peak ? 'rgba(255, 159, 28, 0.03)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '13px 24px', color: '#f8fafc', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {row.time}
                      {row.peak && (
                        <span style={{ background: 'rgba(255,159,28,0.15)', color: '#ff9f1c', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          PEAK
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px', color: '#00b4d8' }}>{row.voltage} V</td>
                  <td style={{ padding: '13px 16px', color: '#00e599' }}>{row.current} A</td>
                  <td style={{ padding: '13px 16px', color: '#ff9f1c' }}>{row.power.toLocaleString()} W</td>
                  <td style={{ padding: '13px 16px', color: '#d946ef', fontWeight: 600 }}>{row.energy} kWh</td>
                  <td style={{ padding: '13px 24px', color: '#ffffff', fontWeight: 700, textAlign: 'right' }}>₹ {row.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
