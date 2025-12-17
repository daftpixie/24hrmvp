// ============================================
// 24HRMVP - USE WEBSOCKET HOOK
// File: frontend/hooks/useWebSocket.ts
// WebSocket hook with all required exports
// ============================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { getWsUrl } from '@/lib/config';

// ============================================
// TYPES
// ============================================

export interface WebSocketOptions {
  autoConnect?: boolean;
  userId?: string;
  username?: string;
}

export interface WebSocketMessage {
  type: string;
  payload: any;
}

export type EventCallback = (data: any) => void;
export type UnsubscribeFn = () => void;

export interface WebSocketHook {
  socket: WebSocket | null;
  isConnected: boolean;
  connected: boolean; // Alias for backward compatibility
  error: string | null;
  send: (type: string, data?: any) => boolean;
  sendMessage: (type: string, payload: any) => void; // Alias
  on: (event: string, callback: EventCallback) => UnsubscribeFn;
  onVoteUpdate: (callback: EventCallback) => UnsubscribeFn;
  onNewPost: (callback: EventCallback) => UnsubscribeFn;
  lastMessage: WebSocketMessage | null;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useWebSocket(optionsOrUrl?: WebSocketOptions | string): WebSocketHook {
  // Handle both old (url string) and new (options object) signatures
  const options: WebSocketOptions = typeof optionsOrUrl === 'string' 
    ? { autoConnect: true } 
    : (optionsOrUrl || { autoConnect: true });

  const wsUrl = typeof optionsOrUrl === 'string' ? optionsOrUrl : getWsUrl();
  
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Add event listener
  const addEventListener = useCallback((event: string, callback: EventCallback): UnsubscribeFn => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = listenersRef.current.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }, []);

  // Emit event to listeners
  const emitEvent = useCallback((event: string, data: any) => {
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

  // Send message
  const send = useCallback((type: string, data?: any): boolean => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      const message = JSON.stringify({ type, payload: data, ...data });
      socketRef.current.send(message);
      return true;
    }
    console.warn('[WebSocket] Cannot send - not connected');
    return false;
  }, []);

  // Alias for backward compatibility
  const sendMessage = useCallback((type: string, payload: any) => {
    send(type, payload);
  }, [send]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN || 
        socketRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    try {
      console.log('[WebSocket] Connecting to:', wsUrl);
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Send auth info if provided
        if (options.userId) {
          socket.send(JSON.stringify({
            type: 'auth',
            userId: options.userId,
            username: options.username,
          }));
        }

        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = undefined;
        }
      };

      socket.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        socketRef.current = null;

        // Attempt reconnect with exponential backoff
        if (options.autoConnect !== false && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      socket.onerror = (event) => {
        console.error('[WebSocket] Error:', event);
        setError('WebSocket connection error');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          // Emit to specific event listeners
          if (data.type) {
            emitEvent(data.type, data.payload || data);
          }

          // Emit to 'message' listeners for any message
          emitEvent('message', data);

          // Handle specific known events
          if (data.type === 'vote-update' || data.type === 'voteUpdate') {
            emitEvent('vote-update', data.payload || data);
          }
          if (data.type === 'new-post' || data.type === 'newPost') {
            emitEvent('new-post', data.payload || data);
          }
          if (data.type === 'new-message' || data.type === 'newMessage') {
            emitEvent('new-message', data.payload || data);
          }
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', event.data);
        }
      };

      socketRef.current = socket;
    } catch (err) {
      console.error('[WebSocket] Failed to create connection:', err);
      setError('Failed to connect');
    }
  }, [wsUrl, options.autoConnect, options.userId, options.username, emitEvent]);

  // Auto-connect on mount
  useEffect(() => {
    if (options.autoConnect !== false) {
      connect();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, options.autoConnect]);

  // Specialized event handlers
  const onVoteUpdate = useCallback((callback: EventCallback): UnsubscribeFn => {
    return addEventListener('vote-update', callback);
  }, [addEventListener]);

  const onNewPost = useCallback((callback: EventCallback): UnsubscribeFn => {
    return addEventListener('new-post', callback);
  }, [addEventListener]);

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
    lastMessage,
  };
}

// Default export
export default useWebSocket;
