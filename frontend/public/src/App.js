// App.js — Root with Login, Role Selection, Theme
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import axios   from 'axios';
import Navbar  from './components/Navbar';
import Home    from './pages/Home';
import Menu    from './pages/Menu';
import Cart    from './pages/Cart';
import Orders  from './pages/Orders';
import Heatmap from './pages/Heatmap';
import Profile from './pages/Profile';
import Complaints    from './pages/Complaints';
import AdminDashboard from './pages/AdminDashboard';
import socket  from './socket';

// ── Theme CSS injected globally ──
const themeStyle = (dark) => `
  body {
    background: ${dark ? '#0d0d0d' : '#f3f4f6'} !important;
    color:      ${dark ? '#f0f0f0' : '#111827'} !important;
    transition: background 0.3s, color 0.3s;
  }
`;

// ════════════════════════════════════════
// LOGIN PAGE
// ════════════════════════════════════════
function LoginPage({ onLogin, dark }) {
  const [role,     setRole]     = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const bg   = dark ? '#0d0d0d' : '#f3f4f6';
  const card = dark ? '#1f2937' : '#ffffff';
  const txt  = dark ? '#f0f0f0' : '#111827';
  const muted= dark ? '#9ca3af' : '#6b7280';
  const bdr  = dark ? '#374151' : '#d1d5db';
  const inp  = dark ? '#111827' : '#f9fafb';

  const handleLogin = async () => {
    if (!username || !password) { setError('Please fill in all fields'); return; }
    setLoading(true); setError('');
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login',
        { username, password, role });
      onLogin(res.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:'100vh', background:bg, display:'flex',
      flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20 }}>
      <style>{themeStyle(dark)}</style>

      {/* Logo */}
      <div style={{ textAlign:'center', marginBottom:32 }}>
        <div style={{ fontSize:48, fontWeight:800, color:'#f97316', letterSpacing:-1 }}>
          Byte<span style={{ color:txt }}>Bite</span>
        </div>
        <div style={{ color:muted, fontSize:14, marginTop:4 }}>
          ACE Engineering College · Canteen System
        </div>
      </div>

      {/* Card */}
      <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:20,
        padding:'32px 36px', width:'100%', maxWidth:420, boxShadow:'0 4px 24px rgba(0,0,0,0.15)' }}>

        <h3 style={{ color:txt, fontWeight:800, marginBottom:24, textAlign:'center' }}>
          Sign In
        </h3>

        {/* Role Toggle */}
        <div style={{ display:'flex', background:dark?'#111827':'#e5e7eb',
          borderRadius:10, padding:4, marginBottom:24 }}>
          {['student','admin'].map(r => (
            <button key={r} onClick={() => { setRole(r); setError(''); }}
              style={{
                flex:1, padding:'8px', border:'none', borderRadius:8,
                background: role===r ? '#f97316' : 'transparent',
                color:      role===r ? 'white' : muted,
                fontWeight: 700, fontSize:14, cursor:'pointer', transition:'all 0.2s'
              }}>
              {r === 'student' ? '👩‍🎓 Student' : '👨‍🍳 Admin'}
            </button>
          ))}
        </div>

        {/* Username */}
        <div style={{ marginBottom:16 }}>
          <label style={{ color:muted, fontSize:12, fontWeight:700,
            textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:6 }}>
            {role === 'student' ? 'Student ID or Email' : 'Username'}
          </label>
          <input
            type="text"
            placeholder={role === 'student' ? 'e.g. 21BCS045' : 'admin'}
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width:'100%', padding:'12px 14px', borderRadius:10,
              border:`1px solid ${bdr}`, background:inp, color:txt,
              fontSize:14, outline:'none', boxSizing:'border-box' }}
          />
        </div>

        {/* Password */}
        <div style={{ marginBottom:20 }}>
          <label style={{ color:muted, fontSize:12, fontWeight:700,
            textTransform:'uppercase', letterSpacing:1, display:'block', marginBottom:6 }}>
            Password
          </label>
          <div style={{ position:'relative' }}>
            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width:'100%', padding:'12px 44px 12px 14px', borderRadius:10,
                border:`1px solid ${bdr}`, background:inp, color:txt,
                fontSize:14, outline:'none', boxSizing:'border-box' }}
            />
            <button onClick={() => setShowPass(!showPass)}
              style={{ position:'absolute', right:12, top:'50%',
                transform:'translateY(-50%)', background:'none',
                border:'none', cursor:'pointer', color:muted, fontSize:16 }}>
              {showPass ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background:'#7f1d1d', color:'#fca5a5', padding:'10px 14px',
            borderRadius:8, fontSize:13, marginBottom:16, fontWeight:600 }}>
            ⚠️ {error}
          </div>
        )}

        {/* Login Button */}
        <button onClick={handleLogin} disabled={loading}
          style={{ width:'100%', padding:'13px', background:'#f97316', color:'white',
            border:'none', borderRadius:12, fontWeight:800, fontSize:16, cursor:'pointer' }}>
          {loading ? '⏳ Signing in...' : 'Sign In →'}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// STUDENT APP
// ════════════════════════════════════════
function StudentApp({ user, onLogout, dark, toggleDark }) {
  const [cart,         setCart]         = useState([]);
  const [wallet,       setWallet]       = useState(user.wallet);
  const [notification, setNotification] = useState(null);

  const showNotif = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 6000);
  };

  useEffect(() => {
    // Browser push notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Token ready notification
    socket.on('notification:tokenReady', (data) => {
      if (data.studentId === user.id) {
        // In-app banner
        showNotif(`🔔 Token #${data.token} is Ready for Pickup!`);
        // Browser push notification
        if (Notification.permission === 'granted') {
          new Notification('ByteBite — Order Ready! 🍽️', {
            body: `Token #${data.token} is ready for pickup at the counter!`,
            icon: '/favicon.ico'
          });
        }
        // Sound ping
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.5);
        } catch (_) {}
      }
    });

    // Order status changed — show banner + browser notif
    socket.on('order:statusUpdate', (order) => {
      if (order.studentId === user.id && order.status === 'preparing') {
        showNotif(`⏳ Token #${order.token} is now being prepared!`);
        if (Notification.permission === 'granted') {
          new Notification('ByteBite — Order Update 🍳', {
            body: `Token #${order.token} is now being prepared!`,
            icon: '/favicon.ico'
          });
        }
      }
    });

    // Wallet update
    socket.on('wallet:update', (data) => setWallet(data.wallet));

    return () => {
      socket.off('notification:tokenReady');
      socket.off('order:statusUpdate');
      socket.off('wallet:update');
    };
  }, [user.id]);

  const addToCart = (item) => {
    setCart(prev => {
      const ex = prev.find(c => c.itemId === (item.id || item._id));
      if (ex) return prev.map(c =>
        c.itemId === (item.id||item._id) ? {...c, quantity:c.quantity+1} : c);
      return [...prev, { itemId:item.id||item._id, name:item.name,
        price:item.price, emoji:item.emoji, quantity:1 }];
    });
  };
  const removeFromCart = (itemId) => {
    setCart(prev => {
      const ex = prev.find(c => c.itemId === itemId);
      if (!ex) return prev;
      if (ex.quantity === 1) return prev.filter(c => c.itemId !== itemId);
      return prev.map(c => c.itemId===itemId ? {...c,quantity:c.quantity-1} : c);
    });
  };
  const clearCart  = () => setCart([]);
  const cartCount  = cart.reduce((s,i) => s+i.quantity, 0);

  const bg   = dark ? '#0d0d0d' : '#f3f4f6';
  const txt  = dark ? '#f0f0f0' : '#111827';

  return (
    <div style={{ background:bg, minHeight:'100vh', color:txt }}>
      <style>{themeStyle(dark)}</style>

      {/* Notification Banner */}
      {notification && (
        <div style={{ position:'fixed', top:0, left:0, right:0, zIndex:9999,
          background:'#16a34a', color:'white', padding:'14px 20px',
          textAlign:'center', fontWeight:700, fontSize:15 }}>
          {notification}
          <button onClick={() => setNotification(null)}
            style={{ marginLeft:16, background:'transparent',
              border:'1px solid white', color:'white',
              borderRadius:4, padding:'2px 8px', cursor:'pointer' }}>✕</button>
        </div>
      )}

      <Navbar cartCount={cartCount} role="student"
        dark={dark} toggleDark={toggleDark}
        onLogout={onLogout} userName={user.name} />

      <Routes>
        <Route path="/"           element={<Home student={{...user, wallet}} />} />
        <Route path="/menu"       element={<Menu addToCart={addToCart} cart={cart} removeFromCart={removeFromCart} dark={dark} />} />
        <Route path="/cart"       element={<Cart cart={cart} addToCart={addToCart} removeFromCart={removeFromCart} clearCart={clearCart} student={{...user, wallet}} dark={dark} />} />
        <Route path="/orders"     element={<Orders student={user} dark={dark} />} />
        <Route path="/heatmap"    element={<Heatmap dark={dark} />} />
        <Route path="/profile"    element={<Profile student={{...user, wallet}} setWallet={setWallet} dark={dark} />} />
        <Route path="/complaints" element={<Complaints student={user} dark={dark} />} />
        <Route path="*"           element={<Home student={{...user, wallet}} />} />
      </Routes>
    </div>
  );
}

// ════════════════════════════════════════
// ADMIN APP
// ════════════════════════════════════════
function AdminApp({ user, onLogout, dark, toggleDark }) {
  return (
    <div style={{ background: dark?'#0d0d0d':'#f3f4f6', minHeight:'100vh' }}>
      <style>{themeStyle(dark)}</style>
      <Navbar role="admin" cartCount={0} dark={dark}
        toggleDark={toggleDark} onLogout={onLogout} userName="Admin" />
      <Routes>
        <Route path="*" element={<AdminDashboard dark={dark} />} />
      </Routes>
    </div>
  );
}

// ════════════════════════════════════════
// ROOT APP
// ════════════════════════════════════════
export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('bytebite_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [dark, setDark] = useState(() =>
    localStorage.getItem('bytebite_theme') !== 'light'
  );

  const toggleDark = () => {
    setDark(d => {
      localStorage.setItem('bytebite_theme', !d ? 'dark' : 'light');
      return !d;
    });
  };

  const handleLogin = (userData) => {
    localStorage.setItem('bytebite_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('bytebite_user');
    setUser(null);
  };

  if (!user) return <LoginPage onLogin={handleLogin} dark={dark} />;

  return (
    <Router>
      {user.role === 'student'
        ? <StudentApp user={user} onLogout={handleLogout} dark={dark} toggleDark={toggleDark} />
        : <AdminApp   user={user} onLogout={handleLogout} dark={dark} toggleDark={toggleDark} />
      }
    </Router>
  );
}