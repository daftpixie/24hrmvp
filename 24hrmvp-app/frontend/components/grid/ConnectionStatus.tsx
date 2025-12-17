'use client';

import { useWebSocket } from '@/hooks/useWebSocket';
import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
}

export default function ConnectionStatus({ className = '', showLabel = true }: ConnectionStatusProps) {
  const { isConnected } = useWebSocket();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
        isConnected 
          ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
          : 'bg-red-500/10 text-red-400 border border-red-500/30'
      }`}>
        {isConnected ? (
          <>
            <Wifi className="w-4 h-4" />
            <span className={`w-2 h-2 rounded-full bg-green-400 animate-pulse`} />
            {showLabel && <span>Connected</span>}
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4" />
            <span className={`w-2 h-2 rounded-full bg-red-400`} />
            {showLabel && <span>Disconnected</span>}
          </>
        )}
      </div>
    </div>
  );
}
