// Navbar.js — with Dark/Light toggle, Logout, Role badge
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar({ cartCount, role, dark, toggleDark, onLogout, userName }) {
  const location = useLocation();
  const bg    = dark ? '#111827' : '#ffffff';
  const bdr   = dark ? '#1f2937' : '#e5e7eb';
  const txt   = dark ? '#f0f0f0' : '#111827';
  const muted = dark ? '#9ca3af' : '#6b7280';
  const accent = role === 'admin' ? '#3b82f6' : '#f97316';

  const isActive = (path) => location.pathname === path;

  const linkStyle = (path) => ({
    textDecoration: 'none',
    color:    isActive(path) ? accent : muted,
    fontWeight: isActive(path) ? 700 : 500,
    fontSize: 14,
    padding:  '4px 0',
    borderBottom: isActive(path) ? `2px solid ${accent}` : '2px solid transparent',
    transition: 'color 0.2s'
  });

  return (
    <nav style={{ background:bg, borderBottom:`1px solid ${bdr}`,
      padding:'12px 24px', display:'flex', alignItems:'center',
      justifyContent:'space-between', flexWrap:'wrap', gap:10,
      position:'sticky', top:0, zIndex:100 }}>

      {/* Logo + Role Badge */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ fontSize:20, fontWeight:800, color:'#f97316', letterSpacing:-0.5 }}>
          Byte<span style={{ color:txt }}>Bite</span>
        </div>
        <span style={{ fontSize:11, fontWeight:700, padding:'2px 10px',
          borderRadius:50, background:role==='admin'?'#1e3a5f':'rgba(249,115,22,0.15)',
          color:accent }}>
          {role === 'admin' ? '👨‍🍳 Admin' : '👩‍🎓 ' + userName}
        </span>
      </div>

      {/* Nav Links */}
      <div style={{ display:'flex', gap:20, flexWrap:'wrap', alignItems:'center' }}>
        {role === 'student' ? (
          <>
            <Link to="/"           style={linkStyle('/')}>🏠 Home</Link>
            <Link to="/menu"       style={linkStyle('/menu')}>🍽️ Menu</Link>
            <Link to="/cart"       style={linkStyle('/cart')}>
              🛒 Cart
              {cartCount > 0 && (
                <span style={{ background:'#f97316', color:'white',
                  borderRadius:50, padding:'1px 7px', fontSize:11,
                  fontWeight:700, marginLeft:5 }}>{cartCount}</span>
              )}
            </Link>
            <Link to="/orders"     style={linkStyle('/orders')}>📋 Orders</Link>
            <Link to="/heatmap"    style={linkStyle('/heatmap')}>🔥 Heatmap</Link>
            <Link to="/complaints" style={linkStyle('/complaints')}>💬 Feedback</Link>
            <Link to="/profile"    style={linkStyle('/profile')}>👤 Profile</Link>
          </>
        ) : (
          <span style={{ color:accent, fontWeight:700, fontSize:14 }}>
            ⚙️ Admin Dashboard
          </span>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        {/* Dark/Light Toggle */}
        <button onClick={toggleDark} title="Toggle theme"
          style={{ background:dark?'#374151':'#e5e7eb', border:'none',
            borderRadius:50, padding:'6px 12px', cursor:'pointer',
            fontSize:16, color:txt }}>
          {dark ? '☀️' : '🌙'}
        </button>
        {/* Logout */}
        <button onClick={onLogout}
          style={{ background:'#7f1d1d', color:'#fca5a5', border:'none',
            borderRadius:8, padding:'7px 14px', fontWeight:700,
            fontSize:13, cursor:'pointer' }}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;