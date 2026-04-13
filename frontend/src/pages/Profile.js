// Profile.js — with Wallet Add Money
import React, { useState } from 'react';
import socket from '../socket';

function Profile({ student, setWallet, dark }) {
  const [addAmt,   setAddAmt]   = useState('');
  const [adding,   setAdding]   = useState(false);
  const [msg,      setMsg]      = useState('');

  const bg   = dark ? '#0d0d0d' : '#f3f4f6';
  const card = dark ? '#1f2937' : '#ffffff';
  const txt  = dark ? '#f0f0f0' : '#111827';
  const muted= dark ? '#9ca3af' : '#6b7280';
  const bdr  = dark ? '#374151' : '#e5e7eb';
  const inp  = dark ? '#111827' : '#f9fafb';

  const handleAddMoney = () => {
    const amount = parseInt(addAmt);
    if (!amount || amount <= 0) { setMsg('Please enter a valid amount'); return; }
    setAdding(true);
    socket.emit('student:addWallet', { studentId: student.id, amount });
    socket.once('wallet:update', (data) => {
      setWallet(data.wallet);
      setMsg(`✅ ₹${amount} added successfully! New balance: ₹${data.wallet}`);
      setAddAmt('');
      setAdding(false);
    });
  };

  return (
    <div style={{ background:bg, minHeight:'100vh', padding:'24px 16px' }}>
      <div style={{ maxWidth:520, margin:'0 auto' }}>
        <h4 style={{ color:'#f97316', fontWeight:800, marginBottom:20 }}>👤 My Profile</h4>

        {/* Avatar */}
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ width:80, height:80, borderRadius:'50%',
            background:'linear-gradient(135deg,#f97316,#dc2626)',
            display:'inline-flex', alignItems:'center', justifyContent:'center',
            fontSize:36, marginBottom:12 }}>👩‍🎓</div>
          <div style={{ fontWeight:800, color:txt, fontSize:20 }}>{student.name}</div>
          <div style={{ color:muted, fontSize:13 }}>{student.id} · {student.email}</div>
        </div>

        {/* Wallet Card */}
        <div style={{ background:'linear-gradient(135deg,#1e3a5f,#0f172a)',
          border:'1px solid #334155', borderRadius:16, padding:'20px',
          marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between',
            alignItems:'center', marginBottom:16 }}>
            <div>
              <div style={{ color:'#94a3b8', fontSize:12, marginBottom:4 }}>
                ByteBite Wallet Balance
              </div>
              <div style={{ fontWeight:800, fontSize:32, color:'#4ade80' }}>
                ₹{student.wallet}
              </div>
            </div>
            <span style={{ fontSize:40 }}>👛</span>
          </div>

          {/* Add Money Section */}
          <div style={{ display:'flex', gap:8 }}>
            <input
              type="number"
              placeholder="Enter amount (e.g. 100)"
              value={addAmt}
              onChange={e => { setAddAmt(e.target.value); setMsg(''); }}
              style={{ flex:1, padding:'10px 12px', borderRadius:10,
                border:'1px solid #334155', background:'#0f172a',
                color:'#f0f0f0', fontSize:14, outline:'none' }}
            />
            <button onClick={handleAddMoney} disabled={adding}
              style={{ background:'#4ade80', color:'#052e16', border:'none',
                borderRadius:10, padding:'10px 18px', fontWeight:800,
                fontSize:14, cursor:'pointer', whiteSpace:'nowrap' }}>
              {adding ? '...' : '+ Add'}
            </button>
          </div>

          {/* Quick amounts */}
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            {[50,100,200,500].map(amt => (
              <button key={amt} onClick={() => setAddAmt(String(amt))}
                style={{ background:'#1e3a5f', color:'#93c5fd', border:'1px solid #334155',
                  borderRadius:8, padding:'5px 12px', fontSize:12,
                  fontWeight:700, cursor:'pointer' }}>
                +₹{amt}
              </button>
            ))}
          </div>

          {msg && (
            <div style={{ marginTop:10, color: msg.startsWith('✅') ? '#4ade80' : '#f87171',
              fontSize:13, fontWeight:600 }}>{msg}</div>
          )}
        </div>

        {/* Student Info */}
        <div style={{ fontSize:11, color:muted, textTransform:'uppercase',
          letterSpacing:1, fontWeight:700, marginBottom:8 }}>Student Info</div>
        {[
          { icon:'🎓', label:'Branch',  val:student.branch },
          { icon:'🏫', label:'Year',    val:student.year   },
          { icon:'📧', label:'Email',   val:student.email  },
          { icon:'🏠', label:'Hostel',  val:student.hostel || 'N/A' },
        ].map(r => (
          <div key={r.label} style={{ background:card, border:`1px solid ${bdr}`,
            borderRadius:12, padding:'12px 16px', marginBottom:8,
            display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontSize:20 }}>{r.icon}</span>
            <span style={{ color:txt, flex:1, fontWeight:600 }}>{r.label}</span>
            <span style={{ color:muted, fontSize:13 }}>{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Profile;