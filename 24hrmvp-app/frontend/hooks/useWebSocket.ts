import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  room?: string;
  events?: Record<string, (data: any) => void>;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
      
      // Join room if specified
      if (options.room) {
        socketInstance.emit(`join:${options.room}`);
      }
    });

    socketInstance.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    // Register custom events
    if (options.events) {
      Object.entries(options.events).forEach(([event, handler]) => {
        socketInstance.on(event, handler);
      });
    }

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const emit = (event: string, data: any) => {
    if (socket && connected) {
      socket.emit(event, data);
    }
  };

  return { socket, connected, emit };
}
