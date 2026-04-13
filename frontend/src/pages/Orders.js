// Orders.js — Real-time order tracking with sound ping
import React, { useState, useEffect } from 'react';
import axios  from 'axios';
import socket from '../socket';

const PROGRESS = {
  pending:     { pct:15,  color:'#9ca3af', label:'⏸ Pending'     },
  preparing:   { pct:55,  color:'#fbbf24', label:'⏳ Preparing'   },
  ready:       { pct:100, color:'#4ade80', label:'✅ Ready!'      },
  completed:   { pct:100, color:'#6366f1', label:'✓ Completed'    },
  uncollected: { pct:100, color:'#f87171', label:'⚠️ Not Picked'  },
};

function playPing() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

function Orders({ student, dark }) {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [banner,  setBanner]  = useState(null);

  const bg   = dark ? '#0d0d0d' : '#f3f4f6';
  const card = dark ? '#1f2937' : '#ffffff';
  const txt  = dark ? '#f0f0f0' : '#111827';
  const muted= dark ? '#9ca3af' : '#6b7280';
  const bdr  = dark ? '#374151' : '#e5e7eb';

  useEffect(() => {
    axios.get(`http://localhost:5000/api/orders/student/${student.id}`)
      .then(res => { setOrders(res.data); setLoading(false); })
      .catch(()  => setLoading(false));

    socket.on('order:new', (order) => {
      if (order.studentId === student.id)
        setOrders(prev => [order, ...prev]);
    });

    socket.on('order:statusUpdate', (updated) => {
      if (updated.studentId === student.id) {
        setOrders(prev => prev.map(o => o._id===updated._id ? updated : o));
        playPing();
        if (updated.status === 'ready') {
          setBanner(`🔔 Token #${updated.token} is Ready for Pickup!`);
          setTimeout(() => setBanner(null), 10000);
        }
        if (updated.status === 'preparing') {
          setBanner(`⏳ Token #${updated.token} is now being prepared!`);
          setTimeout(() => setBanner(null), 6000);
        }
      }
    });

    socket.on('notification:tokenReady', (data) => {
      if (data.studentId === student.id) {
        setBanner(`🔔 Token #${data.token} is Ready for Pickup at the counter!`);
        setTimeout(() => setBanner(null), 10000);
      }
    });

    return () => {
      socket.off('order:new');
      socket.off('order:statusUpdate');
      socket.off('notification:tokenReady');
    };
  }, [student.id]);

  return (
    <div style={{ background:bg, minHeight:'100vh', padding:'24px 16px' }}>
      <div style={{ maxWidth:700, margin:'0 auto' }}>
        <h4 style={{ color:'#f97316', fontWeight:800, marginBottom:16 }}>📋 My Orders</h4>

        {/* Ready Banner */}
        {banner && (
          <div style={{ background:'#14532d', border:'1px solid #16a34a',
            color:'#bbf7d0', borderRadius:12, padding:'14px 16px',
            marginBottom:16, display:'flex', alignItems:'center', gap:10,
            fontWeight:700, fontSize:14 }}>
            <span style={{ fontSize:22 }}>🔔</span>
            {banner}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign:'center', padding:60 }}>
            <div className="spinner-border" style={{ color:'#f97316' }}></div>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, color:muted }}>
            <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
            <p>No orders yet. Go place your first order!</p>
          </div>
        ) : (
          orders.map(order => {
            const prog = PROGRESS[order.status] || PROGRESS.pending;
            return (
              <div key={order._id} style={{ background:card, border:`1px solid ${bdr}`,
                borderRadius:16, padding:'18px', marginBottom:12,
                borderLeft:`4px solid ${prog.color}` }}>

                {/* Header */}
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:10, color:muted, textTransform:'uppercase',
                      letterSpacing:1, marginBottom:2 }}>TOKEN</div>
                    <div style={{ fontSize:34, fontWeight:800, color:'#f97316', lineHeight:1 }}>
                      #{order.token}
                    </div>
                  </div>
                  <span style={{ background:`${prog.color}20`, color:prog.color,
                    padding:'5px 14px', borderRadius:50, fontSize:12,
                    fontWeight:700, border:`1px solid ${prog.color}40` }}>
                    {prog.label}
                  </span>
                </div>

                {/* Progress Bar */}
                <div style={{ background:dark?'#374151':'#e5e7eb',
                  borderRadius:6, height:8, marginBottom:10, overflow:'hidden' }}>
                  <div style={{ width:`${prog.pct}%`, height:'100%',
                    background:prog.color, borderRadius:6,
                    transition:'width 0.8s ease' }} />
                </div>

                {/* Steps */}
                <div style={{ display:'flex', justifyContent:'space-between',
                  marginBottom:10 }}>
                  {['pending','preparing','ready','completed'].map((s,i) => {
                    const statuses = ['pending','preparing','ready','completed'];
                    const curIdx   = statuses.indexOf(order.status);
                    const done     = i <= curIdx;
                    return (
                      <div key={s} style={{ textAlign:'center', flex:1 }}>
                        <div style={{ fontSize:18 }}>
                          {i===0?'📝':i===1?'👨‍🍳':i===2?'🔔':'✅'}
                        </div>
                        <div style={{ fontSize:10, color: done ? prog.color : muted,
                          fontWeight: done ? 700 : 400, marginTop:2, textTransform:'capitalize' }}>
                          {s}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Items */}
                <div style={{ fontSize:13, color:muted, marginBottom:8, paddingTop:8,
                  borderTop:`1px solid ${bdr}` }}>
                  {order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                </div>

                {/* Footer */}
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                  <span style={{ fontWeight:800, color:'#f97316' }}>₹{order.total}</span>
                  <span style={{ color:muted }}>
                    {new Date(order.createdAt).toLocaleTimeString()}
                    {' · '}{order.paymentMethod?.toUpperCase()}
                  </span>
                </div>

                {/* Uncollected warning */}
                {order.status === 'uncollected' && (
                  <div style={{ marginTop:10, background:'#7f1d1d',
                    color:'#fca5a5', padding:'8px 12px', borderRadius:8,
                    fontSize:12, fontWeight:700 }}>
                    ⚠️ This order was not collected. Please contact the canteen.
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Orders;