// Home.js — Landing Page
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import socket from '../socket';

function Home({ student }) {
  const [heatmap,    setHeatmap]    = useState({ count: 0, level: 'green', label: 'Low Crowd' });
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    socket.on('heatmap:update', (data) => setHeatmap(data));
    socket.on('order:new', () => setOrderCount((prev) => prev + 1));
    return () => {
      socket.off('heatmap:update');
      socket.off('order:new');
    };
  }, []);

  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const heatColor = {
    green:  '#4ade80',
    yellow: '#fbbf24',
    red:    '#f87171'
  }[heatmap.level];

  const heatEmoji = {
    green:  '🟢',
    yellow: '🟡',
    red:    '🔴'
  }[heatmap.level];

  // Stats data
  const stats = [
    {
      value:    orderCount,
      label:    'Orders Today',
      subLabel: 'placed so far',
      color:    '#f97316',
      icon:     '📦'
    },
    {
      value:    heatEmoji,
      label:    heatmap.label,
      subLabel: 'crowd level now',
      color:    heatColor,
      icon:     '👥'
    },
    {
      value:    '₹45',
      label:    'Avg Order Value',
      subLabel: 'per student',
      color:    '#34d399',
      icon:     '💰'
    },
    {
      value:    heatmap.count,
      label:    'Active Tokens',
      subLabel: 'in queue now',
      color:    '#60a5fa',
      icon:     '🎫'
    },
  ];

  // Quick actions
  const actions = [
    { icon: '🍽️', label: 'Browse Menu',  desc: 'See today\'s items', path: '/menu',    color: '#f97316' },
    { icon: '📋', label: 'My Orders',    desc: 'Track your orders',  path: '/orders',  color: '#34d399' },
    { icon: '🔥', label: 'Check Crowd',  desc: 'See queue level',    path: '/heatmap', color: '#f87171' },
    { icon: '👤', label: 'My Profile',   desc: 'View your details',  path: '/profile', color: '#60a5fa' },
  ];

  return (
    <div style={{ background: '#0d0d0d', minHeight: '100vh', padding: '24px 16px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* ── Hero Banner ── */}
        <div style={{
          background:   'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
          borderRadius: 20,
          padding:      '28px 28px',
          marginBottom: 24,
          position:     'relative',
          overflow:     'hidden'
        }}>
          {/* Background watermark */}
          <div style={{
            position:   'absolute', right: -10, bottom: -20,
            fontSize:   120, opacity: 0.12, pointerEvents: 'none'
          }}>🍽️</div>

          <h2 style={{
            color:      '#ffffff',
            fontWeight: 800,
            fontSize:   26,
            margin:     0,
            marginBottom: 6
          }}>
            {greeting}, {student.name}! 👋
          </h2>
          <p style={{ color: '#ffe4cc', margin: 0, marginBottom: 4, fontSize: 15 }}>
            What are you craving today?
          </p>
          <p style={{ color: '#ffd0b0', margin: 0, marginBottom: 18, fontSize: 13 }}>
            ⏱ Average wait time: ~8 minutes &nbsp;·&nbsp; Canteen is Open
          </p>
          <Link to="/menu" style={{
            display:      'inline-block',
            background:   '#ffffff',
            color:        '#f97316',
            fontWeight:   800,
            fontSize:     14,
            padding:      '10px 24px',
            borderRadius: 10,
            textDecoration: 'none'
          }}>
            Browse Menu →
          </Link>
        </div>

        {/* ── Stats Row ── */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap:                 12,
          marginBottom:        28
        }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              background:   '#1f2937',
              border:       `1px solid #374151`,
              borderRadius: 14,
              padding:      '18px 16px',
              textAlign:    'center'
            }}>
              {/* Icon */}
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              {/* Big value */}
              <div style={{
                fontSize:   28,
                fontWeight: 800,
                color:      s.color,
                lineHeight: 1,
                marginBottom: 6
              }}>
                {s.value}
              </div>
              {/* Label — clearly visible white */}
              <div style={{
                fontSize:   14,
                fontWeight: 700,
                color:      '#f0f0f0',
                marginBottom: 2
              }}>
                {s.label}
              </div>
              {/* Sub label */}
              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                {s.subLabel}
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <div style={{
          fontSize:     18,
          fontWeight:   800,
          color:        '#f0f0f0',
          marginBottom: 14
        }}>
          Quick Actions
        </div>

        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap:                 12
        }}>
          {actions.map((action) => (
            <Link
              key={action.label}
              to={action.path}
              style={{ textDecoration: 'none' }}
            >
              <div style={{
                background:   '#1f2937',
                border:       `2px solid #374151`,
                borderRadius: 14,
                padding:      '22px 16px',
                textAlign:    'center',
                cursor:       'pointer',
                transition:   'border-color 0.2s, transform 0.15s'
              }}
                onMouseOver={e => {
                  e.currentTarget.style.borderColor = action.color;
                  e.currentTarget.style.transform   = 'scale(1.03)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.borderColor = '#374151';
                  e.currentTarget.style.transform   = 'scale(1)';
                }}
              >
                {/* Icon */}
                <div style={{ fontSize: 36, marginBottom: 10 }}>
                  {action.icon}
                </div>

                {/* Label — big and clearly visible */}
                <div style={{
                  fontSize:     15,
                  fontWeight:   800,
                  color:        '#f9fafb',
                  marginBottom: 4
                }}>
                  {action.label}
                </div>

                {/* Description */}
                <div style={{
                  fontSize: 12,
                  color:    '#9ca3af'
                }}>
                  {action.desc}
                </div>

                {/* Coloured bottom bar */}
                <div style={{
                  marginTop:   12,
                  height:      3,
                  borderRadius: 2,
                  background:  action.color,
                  opacity:     0.6
                }} />
              </div>
            </Link>
          ))}
        </div>

        {/* ── Welcome note ── */}
        <div style={{
          marginTop:    24,
          background:   '#1f2937',
          border:       '1px solid #374151',
          borderRadius: 14,
          padding:      '16px 20px',
          display:      'flex',
          alignItems:   'center',
          gap:          14
        }}>
          <span style={{ fontSize: 28 }}>🎓</span>
          <div>
            <div style={{ fontWeight: 700, color: '#f0f0f0', fontSize: 14 }}>
              {student.name} &nbsp;·&nbsp; {student.studentId}
            </div>
            <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
              {student.branch} &nbsp;·&nbsp; {student.year} &nbsp;·&nbsp; {student.email}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <Link to="/profile" style={{
              background:     '#374151',
              color:          '#f0f0f0',
              borderRadius:   8,
              padding:        '6px 14px',
              fontSize:       12,
              fontWeight:     700,
              textDecoration: 'none'
            }}>
              View Profile →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Home;