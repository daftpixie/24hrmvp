// ============================================
// 24HRMVP - USE WEBSOCKET HOOK (PRODUCTION READY)
// File: frontend/hooks/useWebSocket.ts
// FIXED: JWT token authentication for WebSocket
// ============================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getWsUrl } from '@/lib/config';

// ============================================
// TYPES
// ============================================

export interface WebSocketOptions {
  autoConnect?: boolean;
  userId?: string;
  username?: string;
  token?: string; // JWT token for authentication
}

export interface WebSocketMessage {
  type: string;
  payload: any;
}

export type EventCallback = (data: any) => void;
export type UnsubscribeFn = () => void;

export interface WebSocketHook {
  socket: Socket | null;
  isConnected: boolean;
  connected: boolean; // Alias for backward compatibility
  error: string | null;
  send: (event: string, data?: any) => boolean;
  sendMessage: (event: string, payload: any) => void; // Alias
  on: (event: string, callback: EventCallback) => UnsubscribeFn;
  onVoteUpdate: (callback: EventCallback) => UnsubscribeFn;
  onNewPost: (callback: EventCallback) => UnsubscribeFn;
  onChatMessage: (callback: EventCallback) => UnsubscribeFn;
  lastMessage: WebSocketMessage | null;
  authenticate: () => void;
  isAuthenticated: boolean;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useWebSocket(options: WebSocketOptions = {}): WebSocketHook {
  const {
    autoConnect = true,
    userId,
    username,
    token
  } = options;

  const wsUrl = getWsUrl();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());

  // ============================================
  // EVENT LISTENER MANAGEMENT
  // ============================================

  const addEventListener = useCallback((event: string, callback: EventCallback): UnsubscribeFn => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    // Subscribe on socket if already connected
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }

    // Return unsubscribe function
    return () => {
      const listeners = listenersRef.current.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
    };
  }, []);

  // Emit event to local listeners
  const emitLocal = useCallback((event: string, data: any) => {
    const listeners = listenersRef.current.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`[WebSocket] Error in ${event} listener:`, err);
        }
      });
    }
  }, []);

  // ============================================
  // SEND MESSAGE
  // ============================================

  const send = useCallback((event: string, data?: any): boolean => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
      return true;
    }
    console.warn('[WebSocket] Cannot send - not connected');
    return false;
  }, []);

  // Alias for backward compatibility
  const sendMessage = useCallback((event: string, payload: any) => {
    send(event, payload);
  }, [send]);

  // ============================================
  // AUTHENTICATION
  // ============================================

  const authenticate = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.warn('[WebSocket] Cannot authenticate - not connected');
      return;
    }

    // Prefer token-based auth, fall back to userId/username
    if (token) {
      socketRef.current.emit('auth:login', { token });
    } else if (userId) {
      socketRef.current.emit('auth:login', { userId, username });
    } else {
      console.warn('[WebSocket] No authentication credentials provided');
    }
  }, [token, userId, username]);

  // ============================================
  // CONNECTION MANAGEMENT
  // ============================================

  useEffect(() => {
    if (!autoConnect) return;

    console.log('[WebSocket] Connecting to:', wsUrl);

    // Create Socket.io connection
    const socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
      setError(null);

      // Re-attach listeners
      for (const [event, callbacks] of listenersRef.current.entries()) {
        callbacks.forEach(callback => {
          socket.on(event, callback);
        });
      }

      // Auto-authenticate if credentials provided
      if (token || userId) {
        if (token) {
          socket.emit('auth:login', { token });
        } else {
          socket.emit('auth:login', { userId, username });
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setIsConnected(false);
      setIsAuthenticated(false);
    });

    socket.on('connect_error', (err) => {
      console.error('[WebSocket] Connection error:', err.message);
      setError(`Connection error: ${err.message}`);
    });

    // Authentication events
    socket.on('auth:success', (data) => {
      console.log('[WebSocket] Authenticated:', data);
      setIsAuthenticated(true);
      setError(null);
      emitLocal('auth:success', data);
    });

    socket.on('auth:error', (data) => {
      console.error('[WebSocket] Auth error:', data.message);
      setIsAuthenticated(false);
      setError(data.message);
      emitLocal('auth:error', data);
    });

    // Grid events
    socket.on('grid:joined', (data) => {
      emitLocal('grid:joined', data);
    });

    // Forum events
    socket.on('forum:voteUpdate', (data) => {
      setLastMessage({ type: 'forum:voteUpdate', payload: data });
      emitLocal('vote-update', data);
      emitLocal('forum:voteUpdate', data);
    });

    socket.on('forum:newPost', (data) => {
      setLastMessage({ type: 'forum:newPost', payload: data });
      emitLocal('new-post', data);
      emitLocal('forum:newPost', data);
    });

    socket.on('forum:update', (data) => {
      emitLocal('forum:update', data);
    });

    // Chat events
    socket.on('chat:message', (data) => {
      setLastMessage({ type: 'chat:message', payload: data });
      emitLocal('chat:message', data);
      emitLocal('new-message', data);
    });

    socket.on('chat:messageEdited', (data) => {
      emitLocal('chat:messageEdited', data);
    });

    socket.on('chat:messageDeleted', (data) => {
      emitLocal('chat:messageDeleted', data);
    });

    socket.on('chat:joined', (data) => {
      emitLocal('chat:joined', data);
    });

    socket.on('chat:userJoined', (data) => {
      emitLocal('chat:userJoined', data);
    });

    socket.on('chat:userLeft', (data) => {
      emitLocal('chat:userLeft', data);
    });

    socket.on('chat:typing', (data) => {
      emitLocal('chat:typing', data);
    });

    socket.on('chat:stopTyping', (data) => {
      emitLocal('chat:stopTyping', data);
    });

    // Presence events
    socket.on('presence:update', (data) => {
      emitLocal('presence:update', data);
    });

    // Notification events
    socket.on('notification:new', (data) => {
      emitLocal('notification:new', data);
    });

    // Error handler
    socket.on('error', (data) => {
      console.error('[WebSocket] Error:', data);
      setError(data.message || 'WebSocket error');
      emitLocal('error', data);
    });

    // Cleanup on unmount
    return () => {
      console.log('[WebSocket] Cleaning up connection');
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [wsUrl, autoConnect, token, userId, username, emitLocal]);

  // Re-authenticate when token changes
  useEffect(() => {
    if (isConnected && token && !isAuthenticated) {
      authenticate();
    }
  }, [isConnected, token, isAuthenticated, authenticate]);

  // ============================================
  // SPECIALIZED EVENT HANDLERS
  // ============================================

  const onVoteUpdate = useCallback((callback: EventCallback): UnsubscribeFn => {
    return addEventListener('vote-update', callback);
  }, [addEventListener]);

  const onNewPost = useCallback((callback: EventCallback): UnsubscribeFn => {
    return addEventListener('new-post', callback);
  }, [addEventListener]);

  const onChatMessage = useCallback((callback: EventCallback): UnsubscribeFn => {
    return addEventListener('chat:message', callback);
  }, [addEventListener]);

  // ============================================
  // RETURN HOOK INTERFACE
  // ============================================

  return {
    socket: socketRef.current,
    isConnected,
    connected: isConnected, // Alias
    error,
    send,
    sendMessage,
    on: addEventListener,
    onVoteUpdate,
    onNewPost,
    onChatMessage,
    lastMessage,
    authenticate,
    isAuthenticated,
  };
}

// Default export
export default useWebSocket;
