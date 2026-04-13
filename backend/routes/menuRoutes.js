// menuRoutes.js — REST API for Menu Items
const express = require('express');
const router  = express.Router();
const Item    = require('../models/Item');

// GET /api/menu — Fetch all menu items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/menu/seed — Seed initial menu data (run once)
router.post('/seed', async (req, res) => {
  try {
    await Item.deleteMany({});
    const seedData = [
      { name: 'Masala Dosa',     price: 40, category: 'Breakfast', emoji: '🫓', stock: 8,  prepTime: 5  },
      { name: 'Veg Biryani',     price: 80, category: 'Lunch',     emoji: '🍛', stock: 3,  prepTime: 10 },
      { name: 'Paneer Wrap',     price: 60, category: 'Snacks',    emoji: '🌯', stock: 0,  prepTime: 7  },
      { name: 'Cold Coffee',     price: 35, category: 'Drinks',    emoji: '☕', stock: 15, prepTime: 3  },
      { name: 'Samosa Plate',    price: 25, category: 'Snacks',    emoji: '🥟', stock: 6,  prepTime: 4  },
      { name: 'Chicken Burger',  price: 90, category: 'Lunch',     emoji: '🍔', stock: 2,  prepTime: 8  },
      { name: 'Fresh Lime Soda', price: 20, category: 'Drinks',    emoji: '🍋', stock: 20, prepTime: 2  },
      { name: 'Upma',            price: 30, category: 'Breakfast', emoji: '🍚', stock: 0,  prepTime: 5  },
      { name: 'Veg Noodles',     price: 55, category: 'Lunch',     emoji: '🍜', stock: 5,  prepTime: 9  },
      { name: 'Choco Shake',     price: 45, category: 'Drinks',    emoji: '🍫', stock: 7,  prepTime: 3  },
    ];
    const created = await Item.insertMany(seedData);
    res.json({ message: 'Menu seeded successfully', count: created.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/menu/:id/stock — Update item stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const { stock } = req.body;
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { stock, available: stock > 0 },
      { new: true }
    );
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/menu/:id/toggle — Toggle item availability
router.patch('/:id/toggle', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    item.stock     = item.stock > 0 ? 0 : 5;
    item.available = item.stock > 0;
    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;