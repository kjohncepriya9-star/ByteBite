// Item.js — MongoDB Schema for Menu Items
const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    enum: ['Breakfast', 'Lunch', 'Snacks', 'Drinks'],
    required: true
  },
  emoji: {
    type: String,
    default: '🍽️'
  },
  stock: {
    type: Number,
    default: 10,
    min: 0
  },
  prepTime: {
    type: Number,
    default: 5  // in minutes
  },
  available: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);