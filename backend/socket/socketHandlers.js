// socketHandlers.js — All Socket.IO Real-Time Event Handlers
const Item  = require('../models/Item');
const Order = require('../models/Order');

// Active token count for heatmap calculation
let activeTokenCount = 0;

// Calculate heatmap level from token count
function calcHeatLevel(count) {
  if (count <= 10) return { level: 'green',  label: 'Low Crowd'  };
  if (count <= 25) return { level: 'yellow', label: 'Moderate'   };
  return               { level: 'red',    label: 'High Crowd' };
}

module.exports = function setupSocketHandlers(io) {

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // ── Send current heatmap state on connect ──
    socket.emit('heatmap:update', {
      count: activeTokenCount,
      ...calcHeatLevel(activeTokenCount)
    });

    // ────────────────────────────────────────────
    // EVENT: student:placeOrder
    // Triggered when a student places a new order
    // ────────────────────────────────────────────
    socket.on('student:placeOrder', async (orderData) => {
      try {
        const { studentName, studentId, items, total, paymentMethod } = orderData;

        // Decrement stock in DB
        for (const cartItem of items) {
          await Item.findByIdAndUpdate(cartItem.itemId, {
            $inc: { stock: -cartItem.quantity }
          });
          const updated = await Item.findById(cartItem.itemId);
          if (updated.stock <= 0) {
            updated.stock     = 0;
            updated.available = false;
            await updated.save();
          }
        }

        // Create order in DB
        const newOrder = new Order({
          studentName, studentId, items, total, paymentMethod
        });
        await newOrder.save();

        // Update heatmap count
        activeTokenCount++;

        // Broadcast new order to ALL connected clients (admin sees it instantly)
        io.emit('order:new', newOrder);

        // Broadcast updated inventory to all clients
        const updatedInventory = await Item.find();
        io.emit('inventory:update', updatedInventory);

        // Broadcast heatmap update
        io.emit('heatmap:update', {
          count: activeTokenCount,
          ...calcHeatLevel(activeTokenCount)
        });

        // Confirm order to the placing student
        socket.emit('order:confirmed', newOrder);

        console.log(`[Socket] New order #${newOrder.token} placed by ${studentName}`);
      } catch (err) {
        socket.emit('error:order', { message: err.message });
        console.error('[Socket] Error placing order:', err.message);
      }
    });

    // ────────────────────────────────────────────
    // EVENT: admin:updateStatus
    // Triggered when admin changes order status
    // ────────────────────────────────────────────
    socket.on('admin:updateStatus', async ({ orderId, status }) => {
      try {
        const order = await Order.findByIdAndUpdate(
          orderId,
          { status },
          { new: true }
        );

        // Broadcast status change to ALL clients (student tracker updates)
        io.emit('order:statusUpdate', order);

        // If order is completed, reduce heatmap count
        if (status === 'completed') {
          activeTokenCount = Math.max(0, activeTokenCount - 1);
          io.emit('heatmap:update', {
            count: activeTokenCount,
            ...calcHeatLevel(activeTokenCount)
          });
        }

        // If order is ready, send push notification event
        if (status === 'ready') {
          io.emit('notification:tokenReady', {
            token:     order.token,
            studentId: order.studentId,
            message:   `Token #${order.token} is ready for pickup!`
          });
        }

        console.log(`[Socket] Order #${order.token} → ${status}`);
      } catch (err) {
        console.error('[Socket] Error updating status:', err.message);
      }
    });

    // ────────────────────────────────────────────
    // EVENT: admin:updateStock
    // Triggered when admin changes item stock
    // ────────────────────────────────────────────
    socket.on('admin:updateStock', async ({ itemId, newStock }) => {
      try {
        const item = await Item.findByIdAndUpdate(
          itemId,
          { stock: newStock, available: newStock > 0 },
          { new: true }
        );

        // Broadcast inventory update to all clients
        const allItems = await Item.find();
        io.emit('inventory:update', allItems);

        console.log(`[Socket] Stock updated: ${item.name} → ${newStock}`);
      } catch (err) {
        console.error('[Socket] Error updating stock:', err.message);
      }
    });

    // ────────────────────────────────────────────
    // EVENT: admin:toggleItem
    // Toggle item available/sold-out
    // ────────────────────────────────────────────
    socket.on('admin:toggleItem', async ({ itemId }) => {
      try {
        const item = await Item.findById(itemId);
        item.stock     = item.stock > 0 ? 0 : 5;
        item.available = item.stock > 0;
        await item.save();

        // Broadcast inventory update to all clients
        const allItems = await Item.find();
        io.emit('inventory:update', allItems);

        console.log(`[Socket] Item toggled: ${item.name} → ${item.available ? 'AVAILABLE' : 'SOLD OUT'}`);
      } catch (err) {
        console.error('[Socket] Error toggling item:', err.message);
      }
    });

    // ────────────────────────────────────────────
    // EVENT: client:requestInventory
    // Client requests fresh inventory
    // ────────────────────────────────────────────
    socket.on('client:requestInventory', async () => {
      try {
        const items = await Item.find();
        socket.emit('inventory:update', items);
      } catch (err) {
        console.error('[Socket] Error fetching inventory:', err.message);
      }
    });

    // ────────────────────────────────────────────
    // EVENT: client:requestOrders
    // Client requests all orders (admin use)
    // ────────────────────────────────────────────
    socket.on('client:requestOrders', async () => {
      try {
        const orders = await Order.find().sort({ createdAt: -1 });
        socket.emit('orders:all', orders);
      } catch (err) {
        console.error('[Socket] Error fetching orders:', err.message);
      }
    });

    // ── Disconnect ──
    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
};