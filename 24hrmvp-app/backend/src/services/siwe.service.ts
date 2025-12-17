/**
 * SIWE (Sign-In with Ethereum) Service
 * 
 * Implements EIP-4361 for wallet-based authentication on EVM chains.
 * Supports Ethereum, Base, Polygon, Arbitrum, Optimism.
 * 
 * Security requirements:
 * - Domain validation prevents phishing
 * - Nonce prevents replay attacks (single-use)
 * - Issued-at and expiration time validation
 * - Chain ID validation for network security
 * 
 * @see https://eips.ethereum.org/EIPS/eip-4361
 * @version 2.0.0 - Production Ready
 */

import { verifyMessage } from 'viem';
import { consumeNonce } from './nonce.service';

// Logger (optional)
let logger: any;
try {
  const loggerModule = require('../lib/logger');
  logger = loggerModule.authLogger || loggerModule.logger || console;
} catch {
  logger = console;
}

// Supported EVM chains
export const SUPPORTED_CHAINS: Record<number, { name: string }> = {
  1: { name: 'Ethereum' },
  8453: { name: 'Base' },
  137: { name: 'Polygon' },
  42161: { name: 'Arbitrum' },
  10: { name: 'Optimism' },
};

export type SupportedChainId = keyof typeof SUPPORTED_CHAINS;

// Configuration
const APP_DOMAIN = process.env.APP_DOMAIN || '24hrmvp.xyz';
const ALLOWED_DOMAINS = [APP_DOMAIN, `www.${APP_DOMAIN}`, 'localhost'];
const MESSAGE_VALIDITY_SECONDS = 300; // 5 minutes

// SIWE message format (EIP-4361)
export interface SiweMessage {
  domain: string;
  address: string;
  statement?: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

export interface SiweVerificationResult {
  success: boolean;
  address?: string;
  chainId?: number;
  error?: string;
}

export interface CreateSiweMessageOptions {
  address: string;
  nonce: string;
  chainId?: number;
  statement?: string;
  expirationTime?: Date;
  requestId?: string;
}

/**
 * Parse a SIWE message string into structured data
 */
export function parseSiweMessage(message: string): SiweMessage | null {
  try {
    const lines = message.split('\n');
    
    // Parse first line: "${domain} wants you to sign in with your Ethereum account:"
    const domainMatch = lines[0]?.match(/^(.+?) wants you to sign in with your Ethereum account:$/);
    if (!domainMatch) {
      logger.warn('SIWE parse failed: invalid header');
      return null;
    }
    const domain = domainMatch[1];

    // Parse address (second line)
    const address = lines[1]?.trim();
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      logger.warn('SIWE parse failed: invalid address');
      return null;
    }

    // Find the URI line to separate statement from fields
    const uriLineIndex = lines.findIndex(l => l.startsWith('URI:'));
    if (uriLineIndex === -1) {
      logger.warn('SIWE parse failed: missing URI');
      return null;
    }

    // Statement is between address and URI (lines 3 to uriLineIndex-1)
    const statementLines = lines.slice(3, uriLineIndex).filter(l => l.trim() !== '');
    const statement = statementLines.length > 0 ? statementLines.join('\n') : undefined;

    // Parse key-value fields
    const fields: Record<string, string> = {};
    const resources: string[] = [];
    let inResources = false;

    for (let i = uriLineIndex; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('Resources:')) {
        inResources = true;
        continue;
      }

      if (inResources) {
        if (line.startsWith('- ')) {
          resources.push(line.substring(2).trim());
        }
        continue;
      }

      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim();
        const value = line.substring(colonIndex + 1).trim();
        fields[key] = value;
      }
    }

    // Validate required fields
    if (!fields['URI'] || !fields['Version'] || !fields['Chain ID'] || 
        !fields['Nonce'] || !fields['Issued At']) {
      logger.warn({ fields }, 'SIWE parse failed: missing required fields');
      return null;
    }

    const chainId = parseInt(fields['Chain ID'], 10);
    if (isNaN(chainId)) {
      logger.warn('SIWE parse failed: invalid chain ID');
      return null;
    }

    return {
      domain,
      address: address.toLowerCase(),
      statement,
      uri: fields['URI'],
      version: fields['Version'],
      chainId,
      nonce: fields['Nonce'],
      issuedAt: fields['Issued At'],
      expirationTime: fields['Expiration Time'],
      notBefore: fields['Not Before'],
      requestId: fields['Request ID'],
      resources: resources.length > 0 ? resources : undefined,
    };
  } catch (error) {
    logger.error({ error }, 'SIWE message parsing error');
    return null;
  }
}

/**
 * Create a SIWE message for signing
 */
export function createSiweMessage(options: CreateSiweMessageOptions): string {
  const {
    address,
    nonce,
    chainId = 1,
    statement = 'Sign in to 24HRMVP',
    expirationTime,
    requestId,
  } = options;

  const issuedAt = new Date().toISOString();
  const expTime = expirationTime || new Date(Date.now() + MESSAGE_VALIDITY_SECONDS * 1000);

  let message = `${APP_DOMAIN} wants you to sign in with your Ethereum account:
${address}

${statement}

URI: https://${APP_DOMAIN}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expTime.toISOString()}`;

  if (requestId) {
    message += `\nRequest ID: ${requestId}`;
  }

  return message;
}

/**
 * Verify a SIWE signature
 * 
 * @param message - The original SIWE message
 * @param signature - The signature from the wallet
 * @returns Verification result with address and chain ID
 */
export async function verifySiweMessage(
  message: string,
  signature: `0x${string}`
): Promise<SiweVerificationResult> {
  try {
    // Parse the message
    const parsed = parseSiweMessage(message);
    if (!parsed) {
      return { success: false, error: 'Invalid SIWE message format' };
    }

    // Validate domain
    if (!ALLOWED_DOMAINS.includes(parsed.domain)) {
      logger.warn({ domain: parsed.domain }, 'SIWE domain mismatch');
      return { success: false, error: 'Invalid domain' };
    }

    // Validate chain ID
    if (!(parsed.chainId in SUPPORTED_CHAINS)) {
      logger.warn({ chainId: parsed.chainId }, 'SIWE unsupported chain');
      return { success: false, error: `Unsupported chain ID: ${parsed.chainId}` };
    }

    // Validate version
    if (parsed.version !== '1') {
      return { success: false, error: 'Invalid SIWE version' };
    }

    // Validate timing
    const now = new Date();
    const issuedAt = new Date(parsed.issuedAt);
    
    // Check issued-at is not in the future (with 60s tolerance)
    if (issuedAt > new Date(now.getTime() + 60000)) {
      return { success: false, error: 'Message issued in the future' };
    }

    // Check issued-at is not too old (5 minutes)
    if (issuedAt < new Date(now.getTime() - MESSAGE_VALIDITY_SECONDS * 1000)) {
      return { success: false, error: 'Message too old' };
    }

    // Check expiration time if present
    if (parsed.expirationTime) {
      const expTime = new Date(parsed.expirationTime);
      if (expTime < now) {
        return { success: false, error: 'Message expired' };
      }
    }

    // Check not-before time if present
    if (parsed.notBefore) {
      const notBefore = new Date(parsed.notBefore);
      if (notBefore > now) {
        return { success: false, error: 'Message not yet valid' };
      }
    }

    // Consume nonce (single-use, atomic)
    const nonceData = await consumeNonce(parsed.nonce);
    if (!nonceData) {
      logger.warn({ nonce: parsed.nonce.substring(0, 8) + '...' }, 'SIWE nonce invalid or already used');
      return { success: false, error: 'Invalid or expired nonce' };
    }

    // Verify signature using viem
    const isValid = await verifyMessage({
      address: parsed.address as `0x${string}`,
      message,
      signature,
    });

    if (!isValid) {
      logger.warn({ address: parsed.address }, 'SIWE signature verification failed');
      return { success: false, error: 'Invalid signature' };
    }

    const chainConfig = SUPPORTED_CHAINS[parsed.chainId as SupportedChainId];
    logger.info({ 
      address: parsed.address, 
      chainId: parsed.chainId,
      chain: chainConfig?.name || 'Unknown',
    }, 'SIWE verification successful');

    return {
      success: true,
      address: parsed.address.toLowerCase(),
      chainId: parsed.chainId,
    };
  } catch (error) {
    logger.error({ error }, 'SIWE verification error');
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Verification failed' 
    };
  }
}

/**
 * Validate an Ethereum address format
 */
export function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Normalize an Ethereum address (lowercase)
 */
export function normalizeEthAddress(address: string): string | null {
  if (!isValidEthAddress(address)) {
    return null;
  }
  return address.toLowerCase();
}

/**
 * Get chain name from chain ID
 */
export function getChainName(chainId: number): string | null {
  const chain = SUPPORTED_CHAINS[chainId as SupportedChainId];
  return chain?.name || null;
}

/**
 * Check if a chain ID is supported
 */
export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return chainId in SUPPORTED_CHAINS;
}

export default {
  parseSiweMessage,
  createSiweMessage,
  verifySiweMessage,
  isValidEthAddress,
  normalizeEthAddress,
  getChainName,
  isSupportedChain,
  SUPPORTED_CHAINS,
};
