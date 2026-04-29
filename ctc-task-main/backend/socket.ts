import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketIOServer;

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Client emits 'join' with their userId to receive private notifications
    socket.on('join', (userId: string) => {
      socket.join(userId);
      console.log(`[Socket.IO] Socket ${socket.id} joined room ${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io is not initialized!');
  }
  return io;
};
