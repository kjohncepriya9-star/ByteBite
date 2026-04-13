// socket.js — Socket.IO Client Singleton
// Import this file wherever real-time features are needed
import { io } from 'socket.io-client';

// Connect to the backend server
const socket = io('http://localhost:5000', {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('[Socket] Connected to ByteBite server:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[Socket] Disconnected from server');
});

export default socket;