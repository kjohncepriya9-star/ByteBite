// server.js — ByteBite Full Backend: Express + Socket.IO + JSON DB
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const fs         = require('fs');
const path       = require('path');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET','POST','PATCH','DELETE'] }
});
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

const DB_PATH = path.join(__dirname, 'db.json');
function readDB()       { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); }
function writeDB(data)  { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }

let activeTokenCount = 0;
function calcHeat(n) {
  if (n <= 10) return { level:'green',  label:'Low Crowd'  };
  if (n <= 25) return { level:'yellow', label:'Moderate'   };
  return              { level:'red',    label:'High Crowd' };
}

// ── Auto-mark uncollected orders after 30 minutes ──
setInterval(() => {
  const db  = readDB();
  const now = Date.now();
  let changed = false;
  db.orders.forEach(o => {
    if (o.status === 'ready') {
      const readyTime = new Date(o.readyAt || o.createdAt).getTime();
      if (now - readyTime > 30 * 60 * 1000) {
        o.status    = 'uncollected';
        o.uncollectedAt = new Date().toISOString();
        changed     = true;
      }
    }
  });
  if (changed) {
    writeDB(db);
    io.emit('orders:all', db.orders);
    console.log('[Auto] Marked uncollected orders');
  }
}, 60 * 1000); // check every minute

// ════════════════════════════════════════
// REST ROUTES
// ════════════════════════════════════════

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { username, password, role } = req.body;
  const db = readDB();
  if (role === 'admin') {
    if (username === db.admin.username && password === db.admin.password) {
      return res.json({ success: true, user: { role: 'admin', username: db.admin.username } });
    }
    return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  }
  // Student login — match by id or email
  const student = db.students.find(
    s => (s.id === username || s.email === username) && s.password === password
  );
  if (student) {
    const { password: _, ...safe } = student;
    return res.json({ success: true, user: { role: 'student', ...safe } });
  }
  return res.status(401).json({ success: false, message: 'Invalid student ID or password' });
});

// GET /api/menu
app.get('/api/menu', (req, res) => res.json(readDB().items));

// GET /api/orders
app.get('/api/orders', (req, res) => res.json(readDB().orders));

// GET /api/orders/student/:studentId
app.get('/api/orders/student/:studentId', (req, res) => {
  const db = readDB();
  res.json(db.orders.filter(o => o.studentId === req.params.studentId));
});

// GET /api/students — admin only, no passwords
app.get('/api/students', (req, res) => {
  const db = readDB();
  res.json(db.students.map(({ password: _, ...s }) => s));
});

// POST /api/students — admin creates student
app.post('/api/students', (req, res) => {
  const db = readDB();
  const { name, id, email, password, branch, year, wallet, hostel } = req.body;
  if (db.students.find(s => s.id === id)) {
    return res.status(400).json({ message: 'Student ID already exists' });
  }
  const newStudent = { id, name, email, password, branch, year,
    wallet: Number(wallet) || 0, hostel: hostel || '' };
  db.students.push(newStudent);
  writeDB(db);
  const { password: _, ...safe } = newStudent;
  res.status(201).json(safe);
});

// PATCH /api/students/:id/wallet — add money to wallet
app.patch('/api/students/:id/wallet', (req, res) => {
  const db      = readDB();
  const student = db.students.find(s => s.id === req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  student.wallet = Math.max(0, student.wallet + Number(req.body.amount));
  writeDB(db);
  res.json({ wallet: student.wallet });
});

// GET /api/complaints
app.get('/api/complaints', (req, res) => res.json(readDB().complaints));

// POST /api/complaints
app.post('/api/complaints', (req, res) => {
  const db = readDB();
  const complaint = {
    id:        Date.now().toString(),
    studentId: req.body.studentId,
    studentName: req.body.studentName,
    type:      req.body.type,
    message:   req.body.message,
    rating:    req.body.rating || null,
    status:    'open',
    createdAt: new Date().toISOString()
  };
  db.complaints.unshift(complaint);
  writeDB(db);
  io.emit('complaint:new', complaint);
  res.status(201).json(complaint);
});

// PATCH /api/complaints/:id/resolve
app.patch('/api/complaints/:id/resolve', (req, res) => {
  const db = readDB();
  const c  = db.complaints.find(c => c.id === req.params.id);
  if (!c) return res.status(404).json({ message: 'Not found' });
  c.status = 'resolved';
  writeDB(db);
  io.emit('complaint:resolved', c);
  res.json(c);
});

// Health check
app.get('/', (req, res) => res.json({ message: 'ByteBite Backend Running', status: 'OK' }));

// ════════════════════════════════════════
// SOCKET.IO
// ════════════════════════════════════════
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);
  socket.emit('heatmap:update', { count: activeTokenCount, ...calcHeat(activeTokenCount) });

  // ── Student places order ──
  socket.on('student:placeOrder', (orderData) => {
    const db = readDB();
    const { studentName, studentId, items, total, paymentMethod } = orderData;

    // Wallet payment: deduct balance
    if (paymentMethod === 'wallet') {
      const student = db.students.find(s => s.id === studentId);
      if (!student || student.wallet < total) {
        socket.emit('error:order', { message: 'Insufficient wallet balance' });
        return;
      }
      student.wallet -= total;
      // Add to admin revenue
      db.admin.totalRevenue += total;
    }

    db.tokenCounter += 1;
    const token = db.tokenCounter;

    items.forEach(({ itemId, quantity }) => {
      const item = db.items.find(i => i.id === String(itemId));
      if (item) item.stock = Math.max(0, item.stock - quantity);
    });

    const newOrder = {
      _id: Date.now().toString(), token,
      studentName, studentId, items, total, paymentMethod,
      status: 'pending', createdAt: new Date().toISOString(),
      readyAt: null, uncollectedAt: null
    };
    db.orders.unshift(newOrder);
    writeDB(db);
    activeTokenCount++;

    io.emit('order:new',        newOrder);
    io.emit('inventory:update', db.items);
    io.emit('heatmap:update',   { count: activeTokenCount, ...calcHeat(activeTokenCount) });

    // Send updated wallet to student
    const updatedStudent = db.students.find(s => s.id === studentId);
    if (updatedStudent) {
      socket.emit('wallet:update', { wallet: updatedStudent.wallet });
    }

    socket.emit('order:confirmed', newOrder);
    console.log(`[Order] Token #${token} by ${studentName} via ${paymentMethod}`);
  });

  // ── Admin updates order status ──
  socket.on('admin:updateStatus', ({ orderId, status }) => {
    const db    = readDB();
    const order = db.orders.find(o => o._id === orderId);
    if (!order) return;
    order.status = status;
    if (status === 'ready') order.readyAt = new Date().toISOString();
    writeDB(db);

    io.emit('order:statusUpdate', order);
    io.emit('orders:all', db.orders);

    if (status === 'completed') {
      activeTokenCount = Math.max(0, activeTokenCount - 1);
      io.emit('heatmap:update', { count: activeTokenCount, ...calcHeat(activeTokenCount) });
    }
    if (status === 'ready') {
      io.emit('notification:tokenReady', {
        token: order.token, studentId: order.studentId,
        message: `Token #${order.token} is ready for pickup!`
      });
    }
    console.log(`[Order] #${order.token} → ${status}`);
  });

  // ── Admin updates stock ──
  socket.on('admin:updateStock', ({ itemId, newStock }) => {
    const db   = readDB();
    const item = db.items.find(i => i.id === String(itemId));
    if (!item) return;
    item.stock = newStock;
    writeDB(db);
    io.emit('inventory:update', db.items);
    console.log(`[Stock] ${item.name} → ${newStock}`);
  });

  // ── Admin toggles item ──
  socket.on('admin:toggleItem', ({ itemId }) => {
    const db   = readDB();
    const item = db.items.find(i => i.id === String(itemId));
    if (!item) return;
    item.stock = item.stock > 0 ? 0 : 5;
    writeDB(db);
    io.emit('inventory:update', db.items);
  });

  // ── Add wallet money ──
  socket.on('student:addWallet', ({ studentId, amount }) => {
    const db      = readDB();
    const student = db.students.find(s => s.id === studentId);
    if (!student) return;
    student.wallet += Number(amount);
    writeDB(db);
    socket.emit('wallet:update', { wallet: student.wallet });
    console.log(`[Wallet] ${studentId} +₹${amount} → ₹${student.wallet}`);
  });

  // ── Requests ──
  socket.on('client:requestInventory', () => {
    socket.emit('inventory:update', readDB().items);
  });
  socket.on('client:requestOrders', () => {
    socket.emit('orders:all', readDB().orders);
  });
  socket.on('client:requestComplaints', () => {
    socket.emit('complaints:all', readDB().complaints);
  });

  socket.on('disconnect', () => console.log(`[Socket] Disconnected: ${socket.id}`));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`[Server] ByteBite running at http://localhost:${PORT}`));