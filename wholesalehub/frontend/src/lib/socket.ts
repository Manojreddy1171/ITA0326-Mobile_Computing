import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socket: Socket | null = null;

export const connectSocket = (): Socket => {
  if (socket?.connected) return socket;

  socket = io('/', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    console.log('Socket connected:', socket?.id);
    const user = useAuthStore.getState().user;
    if (user) {
      socket?.emit('join:user', user.id);
      if (user.role === 'seller') socket?.emit('join:seller', user.id);
    }
  });

  socket.on('disconnect', () => console.log('Socket disconnected'));
  socket.on('connect_error', (err) => console.error('Socket error:', err.message));

  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};

export const getSocket = () => socket;

export const joinPool = (poolId: number) => {
  socket?.emit('join:pool', poolId);
};

export const leavePool = (poolId: number) => {
  socket?.emit('leave:pool', poolId);
};
