// AdminDashboard.js — Full Admin Panel
import React, { useState, useEffect } from 'react';
import axios  from 'axios';
import socket from '../socket';

const TABS = [
  ['orders',     '📋 Orders'    ],
  ['inventory',  '📦 Inventory' ],
  ['uncollected','⚠️ Uncollected'],
  ['complaints', '💬 Complaints'],
  ['students',   '🎓 Students'  ],
  ['revenue',    '💰 Revenue'   ],
];

function AdminDashboard({ dark }) {
  const [tab,        setTab]        = useState('orders');
  const [orders,     setOrders]     = useState([]);
  const [inventory,  setInventory]  = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [students,   setStudents]   = useState([]);
  const [revenue,    setRevenue]    = useState(0);
  const [loading,    setLoading]    = useState(true);

  // New student form
  const [newS, setNewS] = useState({ name:'', id:'', email:'',
    password:'', branch:'', year:'', wallet:'', hostel:'' });
  const [newSMsg, setNewSMsg] = useState('');

  const bg   = dark ? '#0d0d0d' : '#f3f4f6';
  const card = dark ? '#1f2937' : '#ffffff';
  const txt  = dark ? '#f0f0f0' : '#111827';
  const muted= dark ? '#9ca3af' : '#6b7280';
  const bdr  = dark ? '#374151' : '#e5e7eb';
  const inp  = dark ? '#111827' : '#f9fafb';

  useEffect(() => {
    socket.emit('client:requestOrders');
    socket.emit('client:requestInventory');
    socket.emit('client:requestComplaints');

    axios.get('http://localhost:5000/api/students')
      .then(res => setStudents(res.data));

    // Load admin revenue from db
    axios.get('http://localhost:5000/api/orders')
      .then(res => {
        const walletOrders = res.data.filter(o => o.paymentMethod === 'wallet');
        setRevenue(walletOrders.reduce((s,o) => s + o.total, 0));
      });

    socket.on('orders:all',     (d) => { setOrders(d);     setLoading(false); });
    socket.on('inventory:update',(d) => { setInventory(d); setLoading(false); });
    socket.on('complaints:all', (d) => { setComplaints(d); setLoading(false); });
    socket.on('order:new',      (o) => {
      setOrders(prev => [o, ...prev]);
      if (o.paymentMethod === 'wallet') setRevenue(r => r + o.total);
    });
    socket.on('order:statusUpdate', (u) => {
      setOrders(prev => prev.map(o => o._id===u._id ? u : o));
    });
    socket.on('complaint:new',  (c) => setComplaints(prev => [c, ...prev]));

    return () => {
      socket.off('orders:all'); socket.off('inventory:update');
      socket.off('complaints:all'); socket.off('order:new');
      socket.off('order:statusUpdate'); socket.off('complaint:new');
    };
  }, []);

  const updateStatus = (orderId, status) =>
    socket.emit('admin:updateStatus', { orderId, status });

  const changeStock = (item, delta) => {
    const itemId   = item.id || item._id;
    const newStock = Math.max(0, item.stock + delta);
    socket.emit('admin:updateStock', { itemId, newStock });
  };

  const toggleItem = (item) =>
    socket.emit('admin:toggleItem', { itemId: item.id || item._id });

  const resolveComplaint = async (id) => {
    await axios.patch(`http://localhost:5000/api/complaints/${id}/resolve`);
    setComplaints(prev => prev.map(c => c.id===id ? {...c,status:'resolved'} : c));
  };

  const createStudent = async () => {
    if (!newS.name||!newS.id||!newS.password) {
      setNewSMsg('Name, ID and Password are required'); return;
    }
    try {
      const res = await axios.post('http://localhost:5000/api/students', newS);
      setStudents(prev => [...prev, res.data]);
      setNewS({ name:'',id:'',email:'',password:'',branch:'',year:'',wallet:'',hostel:'' });
      setNewSMsg('✅ Student created successfully!');
      setTimeout(() => setNewSMsg(''), 4000);
    } catch (err) {
      setNewSMsg('❌ ' + (err.response?.data?.message || 'Error'));
    }
  };

  // Derived data
  const activeOrders    = orders.filter(o => !['completed','uncollected'].includes(o.status));
  const uncollected     = orders.filter(o => o.status === 'uncollected');
  const openComplaints  = complaints.filter(c => c.status === 'open').length;

  const statusColor = {
    pending:'#9ca3af', preparing:'#fbbf24',
    ready:'#4ade80', completed:'#6366f1', uncollected:'#f87171'
  };
  const btnStyle = (bg, color) => ({
    background:bg, color:'white', border:'none', borderRadius:8,
    padding:'6px 14px', fontWeight:700, fontSize:12, cursor:'pointer'
  });

  return (
    <div style={{ background:bg, minHeight:'100vh', padding:'24px 16px' }}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <h4 style={{ color:'#60a5fa', fontWeight:800, marginBottom:20 }}>
          ⚙️ Admin Dashboard
        </h4>

        {/* Summary Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))',
          gap:10, marginBottom:24 }}>
          {[
            { val:activeOrders.length, label:'Active Orders',     color:'#60a5fa' },
            { val:`₹${revenue}`,       label:'Wallet Revenue',    color:'#4ade80' },
            { val:uncollected.length,  label:'Uncollected',       color:'#f87171' },
            { val:openComplaints,      label:'Open Complaints',   color:'#fbbf24' },
            { val:students.length,     label:'Total Students',    color:'#a78bfa' },
            { val:inventory.filter(i=>i.stock===0).length,
              label:'Sold Out Items', color:'#f87171' },
          ].map(s => (
            <div key={s.label} style={{ background:card, border:`1px solid ${bdr}`,
              borderRadius:12, padding:'14px', textAlign:'center' }}>
              <div style={{ fontSize:24, fontWeight:800, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:11, color:muted, marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
          {TABS.map(([id,label]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background: tab===id ? '#2563eb' : card,
              color:      tab===id ? 'white' : muted,
              border:`1px solid ${tab===id?'#3b82f6':bdr}`,
              borderRadius:8, padding:'8px 16px',
              fontWeight:700, fontSize:13, cursor:'pointer'
            }}>{label}</button>
          ))}
        </div>

        {/* ── ORDERS TAB ── */}
        {tab === 'orders' && (
          loading ? <div className="text-center py-4">
            <div className="spinner-border" style={{color:'#60a5fa'}}></div></div>
          : orders.filter(o=>o.status!=='uncollected').length === 0
          ? <div style={{textAlign:'center',padding:48,color:muted}}>
              <div style={{fontSize:48}}>📭</div>
              <p style={{marginTop:12}}>No orders yet</p></div>
          : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
              {orders.filter(o=>o.status!=='uncollected').map(order => (
                <div key={order._id} style={{ background:card, border:`1px solid ${bdr}`,
                  borderRadius:14, padding:'16px',
                  borderLeft:`4px solid ${statusColor[order.status]||'#9ca3af'}` }}>
                  <div style={{display:'flex',justifyContent:'space-between',
                    alignItems:'flex-start',marginBottom:8}}>
                    <div>
                      <div style={{fontSize:10,color:muted,textTransform:'uppercase',
                        letterSpacing:1}}>TOKEN</div>
                      <div style={{fontSize:28,fontWeight:800,color:'#60a5fa',lineHeight:1}}>
                        #{order.token}</div>
                    </div>
                    <span style={{background:`${statusColor[order.status]}20`,
                      color:statusColor[order.status]||'#9ca3af',
                      padding:'4px 12px',borderRadius:50,fontSize:11,fontWeight:700}}>
                      {order.status==='pending'   ?'⏸ Pending'  :
                       order.status==='preparing' ?'⏳ Preparing':
                       order.status==='ready'     ?'✅ Ready'    :'✓ Done'}
                    </span>
                  </div>
                  <div style={{fontSize:12,color:muted,marginBottom:6}}>
                    👤 {order.studentName} · {order.studentId}</div>
                  <div style={{fontSize:12,color:txt,marginBottom:10,
                    borderTop:`1px solid ${bdr}`,paddingTop:8}}>
                    {order.items.map(i=>`${i.quantity}× ${i.name}`).join(', ')}</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div>
                      <span style={{fontWeight:800,color:'#4ade80',fontSize:14}}>
                        ₹{order.total}</span>
                      <span style={{fontSize:11,color:muted,marginLeft:8}}>
                        via {order.paymentMethod?.toUpperCase()}</span>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      {order.status==='pending' &&
                        <button style={btnStyle('#d97706')}
                          onClick={()=>updateStatus(order._id,'preparing')}>▶ Prepare</button>}
                      {order.status==='preparing' &&
                        <button style={btnStyle('#16a34a')}
                          onClick={()=>updateStatus(order._id,'ready')}>✓ Ready</button>}
                      {order.status==='ready' &&
                        <button style={btnStyle('#4f46e5')}
                          onClick={()=>updateStatus(order._id,'completed')}>⬛ Done</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
        )}

        {/* ── INVENTORY TAB ── */}
        {tab === 'inventory' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
            {inventory.map(item => (
              <div key={item.id||item._id} style={{background:card,
                border:`1px solid ${bdr}`,borderRadius:12,padding:'14px 16px',
                display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:30,flexShrink:0}}>{item.emoji}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,color:txt,fontSize:14}}>{item.name}</div>
                  <div style={{fontSize:12,color:muted}}>{item.category} · ₹{item.price}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <button onClick={()=>changeStock(item,-1)} style={{
                    background:'#374151',color:'white',border:'none',
                    borderRadius:6,width:30,height:30,fontWeight:700,
                    fontSize:16,cursor:'pointer'}}>−</button>
                  <span style={{fontWeight:800,fontSize:16,minWidth:28,textAlign:'center',
                    color:item.stock===0?'#f87171':item.stock<=3?'#fbbf24':'#4ade80'}}>
                    {item.stock}</span>
                  <button onClick={()=>changeStock(item,1)} style={{
                    background:'#374151',color:'white',border:'none',
                    borderRadius:6,width:30,height:30,fontWeight:700,
                    fontSize:16,cursor:'pointer'}}>+</button>
                  <button onClick={()=>toggleItem(item)} style={{
                    background:item.stock>0?'#15803d':'#991b1b',
                    color:'white',border:'none',borderRadius:8,
                    padding:'5px 12px',fontWeight:700,fontSize:12,cursor:'pointer'}}>
                    {item.stock>0?'ON':'OFF'}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── UNCOLLECTED TAB ── */}
        {tab === 'uncollected' && (
          uncollected.length === 0
          ? <div style={{textAlign:'center',padding:48,color:muted}}>
              <div style={{fontSize:48}}>✅</div>
              <p style={{marginTop:12}}>No uncollected orders! All good.</p></div>
          : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:12}}>
              {uncollected.map(order => (
                <div key={order._id} style={{background:card,
                  border:'1px solid #f87171',borderRadius:14,padding:'16px',
                  borderLeft:'4px solid #f87171'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                    <div style={{fontWeight:800,fontSize:26,color:'#f87171'}}>
                      #{order.token}</div>
                    <span style={{background:'#7f1d1d',color:'#fca5a5',
                      padding:'4px 12px',borderRadius:50,fontSize:11,fontWeight:700}}>
                      ⚠️ Not Collected</span>
                  </div>
                  <div style={{fontSize:12,color:muted,marginBottom:6}}>
                    👤 {order.studentName} · {order.studentId}</div>
                  <div style={{fontSize:12,color:txt,marginBottom:8}}>
                    {order.items.map(i=>`${i.quantity}× ${i.name}`).join(', ')}</div>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                    <span style={{fontWeight:800,color:'#f87171'}}>₹{order.total}</span>
                    <span style={{color:muted}}>
                      Ordered: {new Date(order.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <div style={{marginTop:10,fontSize:12,color:'#fca5a5',
                    background:'#7f1d1d',padding:'8px 10px',borderRadius:8}}>
                    ⚠️ Order was ready but not collected within 30 minutes.
                    Paid via {order.paymentMethod?.toUpperCase()} — ₹{order.total} retained.</div>
                  <button onClick={()=>updateStatus(order._id,'completed')}
                    style={{...btnStyle('#374151'),marginTop:10,width:'100%',textAlign:'center'}}>
                    Mark as Resolved</button>
                </div>
              ))}
            </div>
        )}

        {/* ── COMPLAINTS TAB ── */}
        {tab === 'complaints' && (
          complaints.length === 0
          ? <div style={{textAlign:'center',padding:48,color:muted}}>
              <div style={{fontSize:48}}>💬</div>
              <p style={{marginTop:12}}>No complaints or reviews yet.</p></div>
          : <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {complaints.map(c => (
                <div key={c.id} style={{background:card,border:`1px solid ${bdr}`,
                  borderRadius:12,padding:'16px'}}>
                  <div style={{display:'flex',justifyContent:'space-between',
                    alignItems:'center',marginBottom:8}}>
                    <div>
                      <span style={{fontSize:12,fontWeight:700,
                        color:c.type==='complaint'?'#f87171':'#fbbf24',
                        textTransform:'uppercase',letterSpacing:1}}>
                        {c.type==='complaint'?'🚨 Complaint':'⭐ Review'}
                        {c.rating&&` · ${'⭐'.repeat(c.rating)}`}
                      </span>
                      <div style={{fontSize:13,color:muted,marginTop:2}}>
                        {c.studentName} · {c.studentId}</div>
                    </div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <span style={{fontSize:11,padding:'3px 10px',borderRadius:50,
                        background:c.status==='open'?'#78350f':'#14532d',
                        color:c.status==='open'?'#fde68a':'#bbf7d0',fontWeight:700}}>
                        {c.status}</span>
                      {c.status==='open'&&(
                        <button onClick={()=>resolveComplaint(c.id)}
                          style={btnStyle('#16a34a')}>Resolve</button>
                      )}
                    </div>
                  </div>
                  <div style={{color:txt,fontSize:14,marginBottom:6}}>{c.message}</div>
                  <div style={{color:muted,fontSize:11}}>
                    {new Date(c.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
        )}

        {/* ── STUDENTS TAB ── */}
        {tab === 'students' && (
          <>
            {/* Create Student Form */}
            <div style={{background:card,border:`1px solid ${bdr}`,
              borderRadius:16,padding:'20px',marginBottom:24}}>
              <div style={{fontWeight:800,color:txt,fontSize:16,marginBottom:16}}>
                ➕ Create New Student Account
              </div>
              <div style={{display:'grid',
                gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:10}}>
                {[
                  ['name','Full Name','text'],
                  ['id','Student ID','text'],
                  ['email','Email','email'],
                  ['password','Password','password'],
                  ['branch','Branch','text'],
                  ['year','Year','text'],
                  ['wallet','Initial Wallet (₹)','number'],
                  ['hostel','Hostel','text'],
                ].map(([field,placeholder,type]) => (
                  <input key={field} type={type} placeholder={placeholder}
                    value={newS[field]}
                    onChange={e => setNewS(p=>({...p,[field]:e.target.value}))}
                    style={{padding:'10px 12px',borderRadius:10,
                      border:`1px solid ${bdr}`,background:inp,
                      color:txt,fontSize:13,outline:'none'}} />
                ))}
              </div>
              {newSMsg && (
                <div style={{color:newSMsg.startsWith('✅')?'#4ade80':'#f87171',
                  fontSize:13,fontWeight:700,margin:'10px 0'}}>{newSMsg}</div>
              )}
              <button onClick={createStudent}
                style={{...btnStyle('#2563eb'),marginTop:12,padding:'10px 24px',fontSize:14}}>
                Create Student
              </button>
            </div>

            {/* Students List */}
            <div style={{display:'grid',
              gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:10}}>
              {students.map(s => (
                <div key={s.id} style={{background:card,border:`1px solid ${bdr}`,
                  borderRadius:12,padding:'14px 16px'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                    <div style={{width:40,height:40,borderRadius:'50%',
                      background:'linear-gradient(135deg,#f97316,#dc2626)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:20,flexShrink:0}}>👤</div>
                    <div>
                      <div style={{fontWeight:700,color:txt,fontSize:14}}>{s.name}</div>
                      <div style={{fontSize:11,color:muted}}>{s.id} · {s.branch}</div>
                    </div>
                    <div style={{marginLeft:'auto',fontWeight:800,color:'#4ade80',fontSize:15}}>
                      ₹{s.wallet}</div>
                  </div>
                  <div style={{fontSize:12,color:muted,display:'flex',gap:10}}>
                    <span>{s.year}</span>
                    <span>·</span>
                    <span>{s.email}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── REVENUE TAB ── */}
        {tab === 'revenue' && (
          <div style={{maxWidth:600}}>
            <div style={{background:'linear-gradient(135deg,#1e3a5f,#0f172a)',
              border:'1px solid #334155',borderRadius:20,padding:'28px',
              textAlign:'center',marginBottom:24}}>
              <div style={{fontSize:14,color:'#94a3b8',marginBottom:8}}>
                Total Wallet Revenue Received
              </div>
              <div style={{fontSize:60,fontWeight:800,color:'#4ade80',lineHeight:1}}>
                ₹{revenue}
              </div>
              <div style={{fontSize:13,color:'#64748b',marginTop:8}}>
                From ByteBite Wallet payments only
              </div>
            </div>

            {/* Revenue breakdown */}
            <div style={{fontWeight:700,color:txt,fontSize:15,marginBottom:12}}>
              Wallet Payment Orders
            </div>
            {orders.filter(o=>o.paymentMethod==='wallet').length === 0
              ? <div style={{textAlign:'center',color:muted,padding:32}}>
                  No wallet payments yet.</div>
              : orders.filter(o=>o.paymentMethod==='wallet').map(order => (
                <div key={order._id} style={{background:card,
                  border:`1px solid ${bdr}`,borderRadius:12,
                  padding:'12px 16px',marginBottom:8,
                  display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontWeight:700,color:txt,fontSize:14}}>
                      Token #{order.token} · {order.studentName}</div>
                    <div style={{fontSize:12,color:muted,marginTop:2}}>
                      {new Date(order.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{fontWeight:800,fontSize:16,color:'#4ade80'}}>
                    +₹{order.total}</div>
                </div>
              ))
            }
          </div>
        )}

      </div>
    </div>
  );
}

export default AdminDashboard;