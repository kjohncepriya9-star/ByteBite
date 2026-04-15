// Menu.js — Digital Menu with Real-Time Inventory
import React, { useState, useEffect } from 'react';
import axios  from 'axios';
import socket from '../socket';

const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Snacks', 'Drinks'];

function Menu({ addToCart, cart, removeFromCart }) {
  const [inventory, setInventory] = useState([]);
  const [category,  setCategory]  = useState('All');
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    // Load initial inventory via REST
    axios.get('http://localhost:5000/api/menu')
      .then(res => { setInventory(res.data); setLoading(false); })
      .catch(() => setLoading(false));

    // Also request via socket for real-time
    socket.emit('client:requestInventory');

    // Listen for ANY inventory update from backend
    // This fires when admin changes stock or toggles item
    socket.on('inventory:update', (updatedItems) => {
      setInventory(updatedItems);
    });

    return () => socket.off('inventory:update');
  }, []);

  const getCartQty = (itemId) => {
    const found = cart.find(c => c.itemId === itemId || c.itemId === String(itemId));
    return found ? found.quantity : 0;
  };

  const filtered = inventory.filter(
    item => category === 'All' || item.category === category
  );

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div className="spinner-border" style={{ color: '#f97316' }}></div>
        <p style={{ color: '#9ca3af', marginTop: 12 }}>Loading menu...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#0d0d0d', minHeight: '100vh' }}>
      <h4 style={{ color: '#f97316', fontWeight: 800, marginBottom: 16 }}>🍽️ Today's Menu</h4>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategory(cat)} style={{
            background:   category === cat ? '#f97316' : '#1f2937',
            color:        'white',
            border:       `1px solid ${category === cat ? '#f97316' : '#374151'}`,
            borderRadius: 50,
            padding:      '6px 18px',
            fontWeight:   600,
            fontSize:     13,
            cursor:       'pointer'
          }}>{cat}</button>
        ))}
      </div>

      {/* Menu Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 12 }}>
        {filtered.map(item => {
          const isSoldOut = item.stock === 0;
          const itemId    = item.id || item._id;
          const cartQty   = getCartQty(itemId);

          return (
            <div key={itemId} style={{
              background:   isSoldOut ? '#1a1a1a' : '#1f2937',
              border:       `1px solid ${isSoldOut ? '#374151' : '#4b5563'}`,
              borderRadius: 14,
              padding:      '14px 16px',
              display:      'flex',
              alignItems:   'center',
              gap:          14,
              opacity:      isSoldOut ? 0.55 : 1,
              transition:   'opacity 0.3s'
            }}>
              {/* Emoji */}
              <span style={{ fontSize: 38, flexShrink: 0 }}>{item.emoji}</span>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: '#f9fafb', fontSize: 15 }}>{item.name}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 13 }}>
                  <span style={{ color: '#f97316', fontWeight: 700 }}>₹{item.price}</span>
                  <span style={{ color: '#6b7280' }}>⏱ {item.prepTime} min</span>
                </div>
                {/* Stock badge */}
                <span style={{
                  display:      'inline-block',
                  marginTop:    6,
                  padding:      '2px 10px',
                  borderRadius: 50,
                  fontSize:     11,
                  fontWeight:   700,
                  background:   isSoldOut
                    ? '#7f1d1d'
                    : item.stock <= 3
                    ? '#78350f'
                    : '#14532d',
                  color: isSoldOut ? '#fca5a5' : item.stock <= 3 ? '#fde68a' : '#bbf7d0'
                }}>
                  {isSoldOut
                    ? '🔴 Sold Out'
                    : item.stock <= 3
                    ? `🟡 Only ${item.stock} left`
                    : `🟢 Available (${item.stock})`}
                </span>
              </div>

              {/* Add / Qty Controls */}
              {isSoldOut ? (
                <div style={{
                  background: '#374151', color: '#9ca3af',
                  borderRadius: 8, padding: '6px 12px',
                  fontSize: 12, fontWeight: 700
                }}>Sold Out</div>
              ) : cartQty === 0 ? (
                <button onClick={() => addToCart(item)} style={{
                  background:   '#f97316',
                  color:        'white',
                  border:       'none',
                  borderRadius: 10,
                  width:        38, height: 38,
                  fontSize:     22,
                  fontWeight:   700,
                  cursor:       'pointer',
                  flexShrink:   0
                }}>+</button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => removeFromCart(itemId)} style={{
                    background: '#374151', color: 'white',
                    border: 'none', borderRadius: 8,
                    width: 32, height: 32, fontSize: 18,
                    fontWeight: 700, cursor: 'pointer'
                  }}>−</button>
                  <span style={{ fontWeight: 800, color: '#f0f0f0', minWidth: 20, textAlign: 'center' }}>
                    {cartQty}
                  </span>
                  <button onClick={() => addToCart(item)} style={{
                    background: '#f97316', color: 'white',
                    border: 'none', borderRadius: 8,
                    width: 32, height: 32, fontSize: 18,
                    fontWeight: 700, cursor: 'pointer'
                  }}>+</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Menu;