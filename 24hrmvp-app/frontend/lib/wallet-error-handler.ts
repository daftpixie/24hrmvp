/**
 * WalletConnect Error Suppression
 * IMPORT THIS FILE FIRST in your app layout!
 * @version 4.5.0
 */

const SUPPRESSED = [
  'connection interrupted',
  'websocket connection closed',
  'pairing already exists',
  'no matching key',
  'socket stalled',
  'missing or invalid',
  'relay connection',
  'jsonrpcerror',
  'relay.walletconnect',
  'wss://',
  'code: 3000',
  'code: 3001',
  'trying to subscribe',
  'socket disconnected',
  'websocket error',
  'already initialized',
  'multiple versions',
  'not found on allowlist',
  'differs from the actual',
  'metadata.url',
  'failed to subscribe',
  'core is already initialized',
];

function shouldSuppress(msg: string): boolean {
  if (!msg) return false;
  const lower = msg.toLowerCase();
  return SUPPRESSED.some(p => lower.includes(p));
}

if (typeof window !== 'undefined' && !(window as any).__wc_suppressor) {
  (window as any).__wc_suppressor = true;
  
  const origError = console.error.bind(console);
  const origWarn = console.warn.bind(console);
  
  console.error = (...args: any[]) => {
    const msg = args.map(String).join(' ');
    if (shouldSuppress(msg)) return;
    origError(...args);
  };
  
  console.warn = (...args: any[]) => {
    const msg = args.map(String).join(' ');
    if (shouldSuppress(msg)) return;
    origWarn(...args);
  };

  window.addEventListener('unhandledrejection', (e) => {
    const msg = e.reason?.message || String(e.reason) || '';
    if (shouldSuppress(msg)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('error', (e) => {
    const msg = e.message || e.error?.message || '';
    if (shouldSuppress(msg)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  }, true);

  console.log('[WC] Error suppression v4.5.0');
}

export {};
