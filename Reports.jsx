import React, { useEffect, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import io from 'socket.io-client';

const WS_URL = 'http://localhost:5000';
const API_URL = 'http://localhost:5000/api';
const COLORS = ['#10b981', '#ef4444', '#f59e42', '#6366f1', '#eab308', '#f472b6'];

function useRealTimeData() {
  const [stats, setStats] = useState({});
  const [objects, setObjects] = useState([]);
  const [source, setSource] = useState('mock');
  const [isLive, setIsLive] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/stats`).then(res => res.json()).then(setStats);
    fetch(`${API_URL}/debris`).then(res => res.json()).then(res => {
      setObjects(res.objects || []);
      setSource(res.source || 'mock');
    });
    socketRef.current = io(WS_URL);
    socketRef.current.on('orbital_data', (data) => {
      setStats(data.stats || {});
      setObjects(data.objects || []);
      setSource(data.source || 'mock');
      setIsLive(true);
    });
    socketRef.current.on('disconnect', () => setIsLive(false));
    return () => {
      socketRef.current.disconnect();
    };
  }, []);
  return { stats, objects, source, isLive };
}

function usePredictions() {
  const [pred, setPred] = useState({debris_trend:[], risk_dist:[], collision_prob:[], orbital_dist:[]});
  useEffect(() => {
    fetch(`${API_URL}/predict`).then(r => r.json()).then(setPred);
  }, []);
  return pred;
}

const Reports = () => {
  const { stats, objects, source, isLive } = useRealTimeData();
  const pred = usePredictions();
  const debrisTrend = pred.debris_trend;
  const collisionTrend = pred.collision_prob;
  const riskDistArr = pred.risk_dist;
  const orbitalDist = pred.orbital_dist;
  const total = stats.total_objects || objects.length;
  const satellites = stats.classification?.active_satellites || objects.filter(o => o.type === 'SATELLITE').length;
  const debris = stats.classification?.debris || objects.filter(o => o.type === 'DEBRIS').length;
  const highRisk = (riskDistArr.find(r => r.name === 'High Risk')?.value || 0) + (riskDistArr.find(r => r.name === 'Critical Risk')?.value || 0);
  const alerts = Math.max(highRisk, Math.floor(total * 0.001));
  const pieData = riskDistArr;

  // Export chart as PNG
  const handleExport = () => {
    const chart = document.querySelector('.glass-card');
    if (!chart) return;
    import('html2canvas').then(html2canvas => {
      html2canvas.default(chart).then(canvas => {
        const link = document.createElement('a');
        link.download = 'report-chart.png';
        link.href = canvas.toDataURL();
        link.click();
      });
    });
  };

  // Share report link
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Report link copied to clipboard!');
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 h-full overflow-y-auto scrollbar-hide bg-gradient-to-br from-[#1a2236] via-[#232946] to-[#0f172a] min-h-screen">
      <h1 className="text-4xl font-orbitron font-bold text-white mb-6 tracking-wide drop-shadow-lg">Reports</h1>
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="glass-card px-6 py-4 min-w-[220px] flex-1"> 
          <div className="text-lg text-[#10b981] font-bold">Total Tracked Objects</div>
          <div className="text-3xl text-white font-extrabold">{total}</div>
          <div className="text-xs text-[#10b981]/80">{source === 'celestrak' ? 'Live' : 'Mock'} • Updated</div>
        </div>
        <div className="glass-card px-6 py-4 min-w-[220px] flex-1"> 
          <div className="text-lg text-[#ef4444] font-bold">High-Risk Collisions</div>
          <div className="text-3xl text-white font-extrabold">{highRisk}</div>
          <div className="text-xs text-[#ef4444]/80">+5.2% • Predicted</div>
        </div>
        <div className="glass-card px-6 py-4 min-w-[220px] flex-1"> 
          <div className="text-lg text-[#06b6d4] font-bold">Active Satellites</div>
          <div className="text-3xl text-white font-extrabold">{satellites}</div>
          <div className="text-xs text-[#06b6d4]/80">+1.8% • Updated</div>
        </div>
        <div className="glass-card px-6 py-4 min-w-[220px] flex-1"> 
          <div className="text-lg text-[#f59e42] font-bold">Recent Alerts</div>
          <div className="text-3xl text-white font-extrabold">{alerts}</div>
          <div className="text-xs text-[#f59e42]/80">+12.5% • Predicted</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-xl font-orbitron text-neon-cyan mb-4">Debris Tracking Trends</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={debrisTrend}>
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
                <Line type="monotone" dataKey="tracked" stroke="#10b981" strokeWidth={3} dot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }} />
                <Line type="monotone" dataKey="newDetections" stroke="#ef4444" strokeWidth={3} dot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-6">
          <h2 className="text-xl font-orbitron text-green-400 mb-4">Risk Distribution</h2>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {pieData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-6">
          <h2 className="text-xl font-orbitron text-orange-400 mb-4">Collision Probability</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={collisionTrend}>
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
                <Area type="monotone" dataKey="value" stroke="#f59e42" fill="#f59e42" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass-card p-6">
          <h2 className="text-xl font-orbitron text-purple-400 mb-4">Orbital Distribution</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orbitalDist}>
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }} />
                <Legend />
                <Bar dataKey="value" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="flex gap-4 mt-8">
        <button className="px-6 py-2 rounded-lg bg-[#10b981] text-white font-bold shadow-md hover:bg-[#14e6a3] transition" onClick={handleExport}>Export</button>
        <button className="px-6 py-2 rounded-lg bg-[#6366f1] text-white font-bold shadow-md hover:bg-[#a5b4fc] transition" onClick={handleShare}>Share</button>
        <button className="px-6 py-2 rounded-lg bg-[#ef4444] text-white font-bold shadow-md hover:bg-[#fca5a5] transition" onClick={handlePrint}>Print</button>
      </div>
    </div>
  );
};

export default Reports;
