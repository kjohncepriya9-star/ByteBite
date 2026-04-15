// Heatmap.js — Real-Time Crowd Heatmap Viewer
import React, { useState, useEffect } from 'react';
import socket from '../socket';

const TIME_SLOTS = [
  { time: '8–9 AM',   pct: 30, color: '#4ade80' },
  { time: '9–10 AM',  pct: 55, color: '#eab308' },
  { time: '10–11 AM', pct: 40, color: '#4ade80' },
  { time: '11–12 PM', pct: 85, color: '#ef4444' },
  { time: '12–1 PM',  pct: 92, color: '#ef4444' },
  { time: '1–2 PM',   pct: 70, color: '#eab308' },
  { time: '2–3 PM',   pct: 38, color: '#4ade80' },
  { time: '3–4 PM',   pct: 60, color: '#eab308' },
  { time: '4–5 PM',   pct: 45, color: '#eab308' },
];

function Heatmap() {
  const [heatmap, setHeatmap] = useState({
    count: 0, level: 'green', label: 'Low Crowd'
  });

  useEffect(() => {
    // Listen for live heatmap updates from backend
    socket.on('heatmap:update', (data) => setHeatmap(data));
    return () => socket.off('heatmap:update');
  }, []);

  const color = {
    green:  '#4ade80',
    yellow: '#eab308',
    red:    '#ef4444'
  }[heatmap.level];

  const description = {
    green:  'Great time to visit! Short queue expected.',
    yellow: 'Moderate crowd. Expect ~10 min wait.',
    red:    'Very busy right now. Pre-ordering is recommended!'
  }[heatmap.level];

  const curHour = new Date().getHours();
  const curSlot = Math.min(Math.max(curHour - 8, 0), TIME_SLOTS.length - 1);

  return (
    <div className="container py-4" style={{ maxWidth: 480 }}>
      <h4 className="fw-bold mb-4" style={{ color: '#f97316' }}>🔥 Canteen Crowd Heatmap</h4>

      {/* Dial */}
      <div className="text-center mb-4">
        <div className="rounded-circle d-inline-flex flex-column align-items-center justify-content-center"
          style={{
            width:     160, height:    160,
            border:    `8px solid ${color}`,
            boxShadow: `0 0 30px ${color}40`,
            transition: 'border-color 0.5s, box-shadow 0.5s'
          }}>
          <div className="fw-bold" style={{ fontSize: 52, color, lineHeight: 1 }}>
            {heatmap.count}
          </div>
          <div className="small text-muted" style={{ fontSize: 11 }}>active tokens</div>
        </div>

        <h5 className="fw-bold mt-3" style={{ color }}>{heatmap.label}</h5>
        <p className="text-muted small">{description}</p>
      </div>

      {/* Level legend */}
      <div className="row g-2 mb-4">
        {[
          { icon: '🟢', range: '≤ 10 tokens', label: 'Low Crowd',  level: 'green'  },
          { icon: '🟡', range: '11–25 tokens', label: 'Moderate',   level: 'yellow' },
          { icon: '🔴', range: '26+ tokens',   label: 'High Crowd', level: 'red'    },
        ].map((z) => (
          <div className="col-4" key={z.level}>
            <div className="text-center p-2 rounded-3"
              style={{
                background: `${heatmap.level === z.level ? z.icon === '🟢' ? '#4ade8015' : z.icon === '🟡' ? '#eab30815' : '#ef444415' : '#161616'}`,
                border:     `1px solid ${heatmap.level === z.level ? color : '#2a2a2a'}`
              }}>
              <div style={{ fontSize: 22 }}>{z.icon}</div>
              <div className="fw-bold small" style={{ color: '#f0f0f0' }}>{z.range}</div>
              <div className="small text-muted">{z.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Rush hour forecast */}
      <h6 className="fw-bold mb-3" style={{ color: '#f0f0f0' }}>Rush Hour Forecast</h6>
      <div className="d-flex flex-column gap-2">
        {TIME_SLOTS.map((slot, i) => (
          <div key={slot.time} className="d-flex align-items-center gap-2">
            <div style={{ width: 60, fontSize: 11, color: i === curSlot ? '#f0f0f0' : '#666', fontWeight: i === curSlot ? 700 : 400 }}>
              {slot.time}{i === curSlot ? ' ←' : ''}
            </div>
            <div className="flex-grow-1 rounded-pill" style={{ background: '#1e1e1e', height: 10, overflow: 'hidden' }}>
              <div className="h-100 rounded-pill" style={{ width: `${slot.pct}%`, background: slot.color, transition: 'width 0.5s' }}></div>
            </div>
            <div style={{ width: 32, fontSize: 11, color: '#555', textAlign: 'right' }}>{slot.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Heatmap;