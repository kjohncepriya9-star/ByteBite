// Complaints.js — Student Complaint and Review Box
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Complaints({ student, dark }) {
  const [type,    setType]    = useState('complaint');
  const [message, setMessage] = useState('');
  const [rating,  setRating]  = useState(0);
  const [myList,  setMyList]  = useState([]);
  const [submitting, setSub]  = useState(false);
  const [success, setSuccess] = useState('');

  const bg   = dark ? '#0d0d0d' : '#f3f4f6';
  const card = dark ? '#1f2937' : '#ffffff';
  const txt  = dark ? '#f0f0f0' : '#111827';
  const muted= dark ? '#9ca3af' : '#6b7280';
  const bdr  = dark ? '#374151' : '#e5e7eb';
  const inp  = dark ? '#111827' : '#f9fafb';

  useEffect(() => {
    axios.get('http://localhost:5000/api/complaints')
      .then(res => setMyList(
        res.data.filter(c => c.studentId === student.id)
      ));
  }, [student.id]);

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSub(true);
    try {
      const res = await axios.post('http://localhost:5000/api/complaints', {
        studentId:   student.id,
        studentName: student.name,
        type,
        message,
        rating: type === 'review' ? rating : null
      });
      setMyList(prev => [res.data, ...prev]);
      setMessage('');
      setRating(0);
      setSuccess(type === 'complaint'
        ? '✅ Complaint submitted! Admin will review it.'
        : '✅ Review submitted! Thank you.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (_) {}
    setSub(false);
  };

  const statusColor = { open:'#fbbf24', resolved:'#4ade80' };

  return (
    <div style={{ background:bg, minHeight:'100vh', padding:'24px 16px' }}>
      <div style={{ maxWidth:580, margin:'0 auto' }}>
        <h4 style={{ color:'#f97316', fontWeight:800, marginBottom:20 }}>
          💬 Feedback & Complaints
        </h4>

        {/* Type Toggle */}
        <div style={{ display:'flex', background:dark?'#111827':'#e5e7eb',
          borderRadius:10, padding:4, marginBottom:20 }}>
          {[['complaint','🚨 Complaint'],['review','⭐ Review']].map(([val,label]) => (
            <button key={val} onClick={() => setType(val)}
              style={{ flex:1, padding:'9px', border:'none', borderRadius:8,
                background: type===val ? '#f97316' : 'transparent',
                color:      type===val ? 'white' : muted,
                fontWeight: 700, fontSize:14, cursor:'pointer' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Form Card */}
        <div style={{ background:card, border:`1px solid ${bdr}`,
          borderRadius:16, padding:'20px', marginBottom:24 }}>

          {/* Star Rating for Review */}
          {type === 'review' && (
            <div style={{ marginBottom:16 }}>
              <div style={{ color:muted, fontSize:12, fontWeight:700,
                textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
                Rating
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {[1,2,3,4,5].map(star => (
                  <button key={star} onClick={() => setRating(star)}
                    style={{ fontSize:28, background:'none', border:'none',
                      cursor:'pointer', opacity: star<=rating ? 1 : 0.3,
                      transition:'opacity 0.15s' }}>
                    ⭐
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          <div style={{ marginBottom:16 }}>
            <div style={{ color:muted, fontSize:12, fontWeight:700,
              textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
              {type === 'complaint' ? 'Describe your issue' : 'Write your review'}
            </div>
            <textarea
              rows={4}
              placeholder={type === 'complaint'
                ? 'e.g. Food was cold, long waiting time, etc.'
                : 'e.g. Great food today! Loved the biryani.'}
              value={message}
              onChange={e => setMessage(e.target.value)}
              style={{ width:'100%', padding:'12px 14px', borderRadius:10,
                border:`1px solid ${bdr}`, background:inp, color:txt,
                fontSize:14, outline:'none', resize:'vertical',
                boxSizing:'border-box' }}
            />
          </div>

          {success && (
            <div style={{ color:'#4ade80', fontSize:13, fontWeight:700,
              marginBottom:12 }}>{success}</div>
          )}

          <button onClick={handleSubmit} disabled={submitting || !message.trim()}
            style={{ width:'100%', background:'#f97316', color:'white', border:'none',
              borderRadius:10, padding:'12px', fontWeight:800, fontSize:15,
              cursor:'pointer', opacity: (!message.trim()||submitting) ? 0.5 : 1 }}>
            {submitting ? '⏳ Submitting...' : `Submit ${type==='complaint'?'Complaint':'Review'}`}
          </button>
        </div>

        {/* My Past Submissions */}
        <div style={{ fontWeight:800, color:txt, fontSize:16, marginBottom:12 }}>
          My Submissions ({myList.length})
        </div>
        {myList.length === 0 ? (
          <div style={{ textAlign:'center', color:muted, padding:32 }}>
            No submissions yet.
          </div>
        ) : myList.map(c => (
          <div key={c.id} style={{ background:card, border:`1px solid ${bdr}`,
            borderRadius:12, padding:'14px 16px', marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:700,
                color: c.type==='complaint' ? '#f87171' : '#fbbf24',
                textTransform:'uppercase', letterSpacing:1 }}>
                {c.type === 'complaint' ? '🚨 Complaint' : '⭐ Review'}
                {c.rating && ` · ${'⭐'.repeat(c.rating)}`}
              </span>
              <span style={{ fontSize:11, padding:'2px 10px', borderRadius:50,
                background:`${statusColor[c.status]}20`,
                color: statusColor[c.status], fontWeight:700 }}>
                {c.status}
              </span>
            </div>
            <div style={{ color:txt, fontSize:14, marginBottom:6 }}>{c.message}</div>
            <div style={{ color:muted, fontSize:11 }}>
              {new Date(c.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Complaints;