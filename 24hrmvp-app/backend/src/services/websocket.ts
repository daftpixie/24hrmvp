import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { publisher, subscriber } from './redis';
import { prisma } from '../db/client';

let io: SocketIOServer;

export function initWebSocket(server: HTTPServer) {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }
  });

  // Redis pub/sub for scaling
  subscriber.subscribe('voting:updates');
  subscriber.subscribe('leaderboard:updates');
  subscriber.subscribe('mvp:progress');

  subscriber.on('message', (channel, message) => {
    const data = JSON.parse(message);
    
    switch (channel) {
      case 'voting:updates':
        io.to('voting').emit('vote:update', data);
        break;
      case 'leaderboard:updates':
        io.to('leaderboard').emit('leaderboard:update', data);
        break;
      case 'mvp:progress':
        io.to(`mvp:${data.projectId}`).emit('mvp:progress', data);
        break;
    }
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join rooms
    socket.on('join:voting', () => socket.join('voting'));
    socket.on('join:leaderboard', () => socket.join('leaderboard'));
    socket.on('join:mvp', (projectId) => socket.join(`mvp:${projectId}`));

    // Real-time voting
    socket.on('vote:cast', async (data) => {
      // Emit to all clients in voting room
      publisher.publish('voting:updates', JSON.stringify({
        ideaId: data.ideaId,
        voteCount: data.voteCount,
        userId: data.userId
      }));
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  console.log('✓ WebSocket server initialized');
}

export function emitToRoom(room: string, event: string, data: any) {
  if (io) {
    io.to(room).emit(event, data);
  }
}

export function emitProgress(projectId: string, progress: number, message: string) {
  const data = { projectId, progress, message, timestamp: new Date() };
  publisher.publish('mvp:progress', JSON.stringify(data));
}

export { io };
