// server.js — ByteBite Backend (Corrected & Stable)

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// ✅ Better CORS (important for Vercel frontend)
const FRONTEND_URL = process.env.FRONTEND_URL || "*";

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true
  }
});

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));

app.use(express.json());

const DB_PATH = path.join(__dirname, 'db.json');

// 📁 DB Helpers (SAFE VERSION)
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch (err) {
    console.error("DB Read Error:", err);
    return { students: [], orders: [], items: [], complaints: [], admin: {}, tokenCounter: 0 };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("DB Write Error:", err);
  }
}

// 🔥 Crowd logic
let activeTokenCount = 0;

function calcHeat(n) {
  if (n <= 10) return { level: 'green', label: 'Low Crowd' };
  if (n <= 25) return { level: 'yellow', label: 'Moderate' };
  return { level: 'red', label: 'High Crowd' };
}

// ⏱ Auto mark uncollected (FIXED COUNT BUG)
setInterval(() => {
  const db = readDB();
  const now = Date.now();
  let changed = false;

  db.orders.forEach(o => {
    if (o.status === 'ready') {
      const readyTime = new Date(o.readyAt || o.createdAt).getTime();

      if (now - readyTime > 30 * 60 * 1000) {
        o.status = 'uncollected';
        o.uncollectedAt = new Date().toISOString();
        activeTokenCount = Math.max(0, activeTokenCount - 1); // ✅ FIX
        changed = true;
      }
    }
  });

  if (changed) {
    writeDB(db);
    io.emit('orders:all', db.orders);
  }
}, 60000);

// ════════════════════════════════
// 🔹 REST ROUTES
// ════════════════════════════════

// LOGIN
app.post('/api/auth/login', (req, res) => {
  const { username, password, role } = req.body;
  const db = readDB();

  if (!username || !password || !role) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  if (role === 'admin') {
    if (username === db.admin.username && password === db.admin.password) {
      return res.json({ success: true, user: { role: 'admin', username } });
    }
    return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  }

  const student = db.students.find(
    s => (s.id === username || s.email === username) && s.password === password
  );

  if (student) {
    const { password: _, ...safe } = student;
    return res.json({ success: true, user: { role: 'student', ...safe } });
  }

  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// MENU
app.get('/api/menu', (req, res) => res.json(readDB().items));

// ORDERS
app.get('/api/orders', (req, res) => res.json(readDB().orders));

app.get('/api/orders/student/:studentId', (req, res) => {
  const db = readDB();
  res.json(db.orders.filter(o => o.studentId === req.params.studentId));
});

// STUDENTS
app.get('/api/students', (req, res) => {
  const db = readDB();
  res.json(db.students.map(({ password, ...s }) => s));
});

app.post('/api/students', (req, res) => {
  const db = readDB();
  const { name, id, email, password, branch, year, wallet, hostel } = req.body;

  if (db.students.find(s => s.id === id)) {
    return res.status(400).json({ message: 'Student exists' });
  }

  const newStudent = {
    id, name, email, password, branch, year,
    wallet: Number(wallet) || 0,
    hostel: hostel || ''
  };

  db.students.push(newStudent);
  writeDB(db);

  const { password: _, ...safe } = newStudent;
  res.status(201).json(safe);
});

// WALLET UPDATE
app.patch('/api/students/:id/wallet', (req, res) => {
  const db = readDB();
  const student = db.students.find(s => s.id === req.params.id);

  if (!student) return res.status(404).json({ message: 'Not found' });

  student.wallet += Number(req.body.amount);
  writeDB(db);

  io.emit('wallet:update', { wallet: student.wallet }); // ✅ important

  res.json({ wallet: student.wallet });
});

// COMPLAINTS
app.get('/api/complaints', (req, res) => res.json(readDB().complaints));

app.post('/api/complaints', (req, res) => {
  const db = readDB();

  const complaint = {
    id: Date.now().toString(),
    ...req.body,
    status: 'open',
    createdAt: new Date().toISOString()
  };

  db.complaints.unshift(complaint);
  writeDB(db);

  io.emit('complaint:new', complaint);
  res.status(201).json(complaint);
});

// HEALTH
app.get('/', (req, res) => {
  res.json({ message: 'ByteBite Backend Running', status: 'OK' });
});

// ════════════════════════════════
// 🔹 SOCKET.IO
// ════════════════════════════════

io.on('connection', (socket) => {
  console.log(`✅ Connected: ${socket.id}`);

  socket.emit('heatmap:update', {
    count: activeTokenCount,
    ...calcHeat(activeTokenCount)
  });

  // 🧾 PLACE ORDER
  socket.on('student:placeOrder', (orderData) => {
    const db = readDB();
    const { studentName, studentId, items, total, paymentMethod } = orderData;

    if (!items || items.length === 0) {
      return socket.emit('error:order', { message: 'Empty order' });
    }

    if (paymentMethod === 'wallet') {
      const student = db.students.find(s => s.id === studentId);

      if (!student || student.wallet < total) {
        return socket.emit('error:order', { message: 'Insufficient balance' });
      }

      student.wallet -= total;
      db.admin.totalRevenue += total;
    }

    db.tokenCounter += 1;
    const token = db.tokenCounter;

    items.forEach(({ itemId, quantity }) => {
      const item = db.items.find(i => i.id === String(itemId));
      if (item) item.stock = Math.max(0, item.stock - quantity); // ✅ safe
    });

    const newOrder = {
      _id: Date.now().toString(),
      token,
      studentName,
      studentId,
      items,
      total,
      paymentMethod,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    db.orders.unshift(newOrder);
    writeDB(db);

    activeTokenCount++;

    io.emit('order:new', newOrder);
    io.emit('inventory:update', db.items);
    io.emit('heatmap:update', {
      count: activeTokenCount,
      ...calcHeat(activeTokenCount)
    });

    socket.emit('order:confirmed', newOrder);
  });

  // 🔄 UPDATE STATUS
  socket.on('admin:updateStatus', ({ orderId, status }) => {
    const db = readDB();
    const order = db.orders.find(o => o._id === orderId);
    if (!order) return;

    order.status = status;

    if (status === 'ready') order.readyAt = new Date().toISOString();

    if (status === 'completed' || status === 'uncollected') {
      activeTokenCount = Math.max(0, activeTokenCount - 1); // ✅ FIX
    }

    writeDB(db);

    io.emit('order:statusUpdate', order);
    io.emit('orders:all', db.orders);
  });

  // 📦 STOCK UPDATE
  socket.on('admin:updateStock', ({ itemId, newStock }) => {
    const db = readDB();
    const item = db.items.find(i => i.id === String(itemId));
    if (!item) return;

    item.stock = newStock;
    writeDB(db);

    io.emit('inventory:update', db.items);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

// 🚀 START SERVER
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 ByteBite backend running on port ${PORT}`);
});