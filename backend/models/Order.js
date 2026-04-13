// Order.js — MongoDB Schema for Orders
const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  name: String,
  price: Number,
  quantity: Number,
  emoji: String
});

const OrderSchema = new mongoose.Schema({
  token: {
    type: Number,
    unique: true
  },
  studentName: {
    type: String,
    required: true
  },
  studentId: {
    type: String,
    required: true
  },
  items: [OrderItemSchema],
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'preparing', 'ready', 'completed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    default: 'UPI'
  }
}, { timestamps: true });

// Auto-generate token before saving
OrderSchema.pre('save', async function (next) {
  if (!this.token) {
    const lastOrder = await mongoose.model('Order')
      .findOne().sort({ token: -1 });
    this.token = lastOrder ? lastOrder.token + 1 : 101;
  }
  next();
});

module.exports = mongoose.model('Order', OrderSchema);