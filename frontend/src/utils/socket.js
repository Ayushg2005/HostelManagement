import { io } from 'socket.io-client';

// Connect to current origin (Vite proxy routes /socket.io to express backend)
export const socket = io(window.location.origin, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});
