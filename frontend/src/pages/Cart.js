// Cart.js — with Wallet balance check, deduction, payment
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

const PAYMENT_METHODS = [
  { id:'wallet',  icon:'👛', label:'ByteBite Wallet'       },
  { id:'upi',     icon:'📱', label:'UPI / GPay / PhonePe'  },
  { id:'card',    icon:'💳', label:'Credit / Debit Card'   },
  { id:'netbank', icon:'🏦', label:'Net Banking'           },
];

function Cart({ cart, addToCart, removeFromCart, clearCart, student, dark }) {
  const navigate = useNavigate();
  const [step,     setStep]     = useState('cart');
  const [method,   setMethod]   = useState('wallet');
  const [confirmed,setConfirmed]= useState(null);
  const [processing,setProc]   = useState(false);
  const [walletErr, setWalletErr]= useState('');

  const total    = cart.reduce((s,i) => s + i.price * i.quantity, 0);
  const bg       = dark ? '#0d0d0d' : '#f3f4f6';
  const card     = dark ? '#1f2937' : '#ffffff';
  const txt      = dark ? '#f0f0f0' : '#111827';
  const muted    = dark ? '#9ca3af' : '#6b7280';
  const bdr      = dark ? '#374151' : '#e5e7eb';

  const handlePay = () => {
    // Wallet balance check
    if (method === 'wallet' && student.wallet < total) {
      setWalletErr(`Insufficient balance! Your wallet has ₹${student.wallet} but order total is ₹${total}.`);
      return;
    }
    setWalletErr('');
    setProc(true);

    socket.emit('student:placeOrder', {
      studentName:   student.name,
      studentId:     student.id,
      items:         cart,
      total,
      paymentMethod: method
    });

    socket.once('order:confirmed', (order) => {
      setConfirmed(order);
      setStep('success');
      setProc(false);
      clearCart();
    });

    socket.once('error:order', (err) => {
      setWalletErr(err.message);
      setProc(false);
    });
  };

  if (cart.length === 0 && step !== 'success') {
    return (
      <div style={{ background:bg, minHeight:'100vh', display:'flex',
        flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <div style={{ fontSize:64 }}>🛒</div>
        <h5 style={{ color:txt, marginTop:16 }}>Your cart is empty</h5>
        <p style={{ color:muted }}>Add items from the menu to get started.</p>
        <button onClick={() => navigate('/menu')}
          style={{ background:'#f97316', color:'white', border:'none',
            borderRadius:10, padding:'10px 24px', fontWeight:700,
            fontSize:14, cursor:'pointer', marginTop:8 }}>
          Browse Menu
        </button>
      </div>
    );
  }

  return (
    <div style={{ background:bg, minHeight:'100vh', padding:'24px 16px' }}>
      <div style={{ maxWidth:520, margin:'0 auto' }}>

        {/* ── CART STEP ── */}
        {step === 'cart' && (
          <>
            <h4 style={{ color:'#f97316', fontWeight:800, marginBottom:20 }}>🛒 Your Cart</h4>
            {cart.map(item => (
              <div key={item.itemId} style={{ background:card, border:`1px solid ${bdr}`,
                borderRadius:14, padding:'14px 16px', marginBottom:10,
                display:'flex', alignItems:'center', gap:12 }}>
                <span style={{ fontSize:28 }}>{item.emoji}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:txt }}>{item.name}</div>
                  <div style={{ fontSize:12, color:muted }}>₹{item.price} each</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <button onClick={() => removeFromCart(item.itemId)}
                    style={{ background:'#374151', color:'white', border:'none',
                      borderRadius:7, width:28, height:28, fontWeight:700,
                      fontSize:16, cursor:'pointer' }}>−</button>
                  <span style={{ fontWeight:800, color:txt, minWidth:20, textAlign:'center' }}>
                    {item.quantity}
                  </span>
                  <button onClick={() => addToCart({id:item.itemId,...item})}
                    style={{ background:'#f97316', color:'white', border:'none',
                      borderRadius:7, width:28, height:28, fontWeight:700,
                      fontSize:16, cursor:'pointer' }}>+</button>
                </div>
                <div style={{ fontWeight:800, color:'#f97316', minWidth:52, textAlign:'right' }}>
                  ₹{item.price * item.quantity}
                </div>
              </div>
            ))}

            {/* Total */}
            <div style={{ background:card, border:`1px solid ${bdr}`, borderRadius:14,
              padding:'14px 16px', display:'flex',
              justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <span style={{ color:muted }}>Total Amount</span>
              <span style={{ fontWeight:800, fontSize:26, color:'#f97316' }}>₹{total}</span>
            </div>

            <button onClick={() => setStep('payment')}
              style={{ width:'100%', background:'#f97316', color:'white', border:'none',
                borderRadius:12, padding:'14px', fontWeight:800, fontSize:16, cursor:'pointer' }}>
              Proceed to Pay →
            </button>
          </>
        )}

        {/* ── PAYMENT STEP ── */}
        {step === 'payment' && (
          <>
            <h4 style={{ color:'#f97316', fontWeight:800, marginBottom:20 }}>💳 Choose Payment</h4>

            {/* Wallet Balance Display */}
            <div style={{ background:dark?'#0f2027':'#ecfdf5', border:`1px solid ${dark?'#134e4a':'#6ee7b7'}`,
              borderRadius:12, padding:'12px 16px', marginBottom:16,
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ color:dark?'#6ee7b7':'#065f46', fontWeight:600, fontSize:14 }}>
                👛 Wallet Balance
              </span>
              <span style={{ fontWeight:800, fontSize:18,
                color: student.wallet >= total ? '#4ade80' : '#f87171' }}>
                ₹{student.wallet}
              </span>
            </div>

            {/* Insufficient balance warning */}
            {walletErr && (
              <div style={{ background:'#7f1d1d', color:'#fca5a5', padding:'12px 14px',
                borderRadius:10, fontSize:13, fontWeight:600, marginBottom:16 }}>
                ⚠️ {walletErr}
              </div>
            )}

            {/* Payment methods */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
              {PAYMENT_METHODS.map(m => (
                <div key={m.id} onClick={() => { setMethod(m.id); setWalletErr(''); }}
                  style={{ background:card, border:`2px solid ${method===m.id?'#f97316':bdr}`,
                    borderRadius:12, padding:'14px 16px', display:'flex',
                    alignItems:'center', gap:12, cursor:'pointer' }}>
                  <span style={{ fontSize:24 }}>{m.icon}</span>
                  <span style={{ color:txt, fontWeight:600, flex:1 }}>{m.label}</span>
                  {m.id === 'wallet' && (
                    <span style={{ fontSize:12,
                      color: student.wallet >= total ? '#4ade80' : '#f87171',
                      fontWeight:700 }}>
                      {student.wallet >= total ? `₹${student.wallet} ✓` : 'Low balance ✗'}
                    </span>
                  )}
                  {method === m.id && (
                    <span style={{ color:'#f97316', fontWeight:800 }}>✓</span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ textAlign:'center', color:muted, fontSize:12, marginBottom:16 }}>
              🔒 Secure payment · Total: ₹{total}
            </div>

            <button onClick={handlePay} disabled={processing}
              style={{ width:'100%', background:'#f97316', color:'white', border:'none',
                borderRadius:12, padding:'14px', fontWeight:800, fontSize:16,
                cursor:'pointer', opacity:processing?0.7:1 }}>
              {processing ? '⏳ Processing...' : `Pay ₹${total}`}
            </button>
            <button onClick={() => { setStep('cart'); setWalletErr(''); }}
              style={{ width:'100%', background:'transparent', color:muted, border:'none',
                padding:'10px', fontWeight:600, fontSize:14, cursor:'pointer', marginTop:8 }}>
              ← Back to Cart
            </button>
          </>
        )}

        {/* ── SUCCESS STEP ── */}
        {step === 'success' && confirmed && (
          <div style={{ textAlign:'center', paddingTop:20 }}>
            <div style={{ fontSize:64 }}>✅</div>
            <h4 style={{ color:txt, fontWeight:800, marginTop:12 }}>Order Confirmed!</h4>
            <div style={{ background:'linear-gradient(135deg,#f97316,#dc2626)',
              borderRadius:20, padding:'28px', margin:'20px auto',
              maxWidth:280, color:'white' }}>
              <div style={{ fontSize:12, opacity:0.8, textTransform:'uppercase',
                letterSpacing:2 }}>Token Number</div>
              <div style={{ fontSize:80, fontWeight:800, lineHeight:1, margin:'8px 0' }}>
                {confirmed.token}
              </div>
              <div style={{ fontSize:13, opacity:0.85 }}>
                🔔 You'll be notified when ready
              </div>
            </div>
            <p style={{ color:muted, fontSize:13 }}>Estimated wait: ~8 minutes</p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', marginTop:16 }}>
              <button onClick={() => navigate('/orders')}
                style={{ background:'#f97316', color:'white', border:'none',
                  borderRadius:10, padding:'10px 20px', fontWeight:700,
                  fontSize:14, cursor:'pointer' }}>
                Track Order →
              </button>
              <button onClick={() => navigate('/menu')}
                style={{ background:card, color:txt, border:`1px solid ${bdr}`,
                  borderRadius:10, padding:'10px 20px', fontWeight:700,
                  fontSize:14, cursor:'pointer' }}>
                Order More
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;