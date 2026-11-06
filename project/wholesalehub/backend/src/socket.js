let _io = null;

const init = (io) => {
  _io = io;

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('join:user', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined room user_${userId}`);
    });

    socket.on('join:seller', (sellerId) => {
      socket.join(`seller_${sellerId}`);
    });

    socket.on('join:pool', (poolId) => {
      socket.join(`pool_${poolId}`);
    });

    socket.on('leave:pool', (poolId) => {
      socket.leave(`pool_${poolId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

const getIO = () => {
  if (!_io) throw new Error('Socket.io not initialized');
  return _io;
};

module.exports = { init, getIO };
