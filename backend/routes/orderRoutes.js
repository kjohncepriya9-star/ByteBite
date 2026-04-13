// orderRoutes.js — REST API for Orders
const express = require('express');
const router  = express.Router();
const Order   = require('../models/Order');
const Item    = require('../models/Item');

// GET /api/orders — Fetch all orders (most recent first)
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/orders/student/:studentId — Fetch orders by student
router.get('/student/:studentId', async (req, res) => {
  try {
    const orders = await Order.find({
      studentId: req.params.studentId
    }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/orders — Place a new order
router.post('/', async (req, res) => {
  try {
    const { studentName, studentId, items, total, paymentMethod } = req.body;

    // Decrement stock for each ordered item
    for (const cartItem of items) {
      const dbItem = await Item.findById(cartItem.itemId);
      if (dbItem) {
        dbItem.stock = Math.max(0, dbItem.stock - cartItem.quantity);
        dbItem.available = dbItem.stock > 0;
        await dbItem.save();
      }
    }

    // Create the order
    const newOrder = new Order({
      studentName,
      studentId,
      items,
      total,
      paymentMethod,
      status: 'pending'
    });
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/orders/:id/status — Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;