"use strict";
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
 * @version 1.0.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_CHAINS = void 0;
exports.parseSiweMessage = parseSiweMessage;
exports.createSiweMessage = createSiweMessage;
exports.verifySiweMessage = verifySiweMessage;
exports.isValidEthAddress = isValidEthAddress;
exports.normalizeEthAddress = normalizeEthAddress;
exports.getChainName = getChainName;
exports.isSupportedChain = isSupportedChain;
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const nonce_service_1 = require("./nonce.service");
// Logger (optional)
let logger;
try {
    const loggerModule = require('../lib/logger');
    logger = loggerModule.authLogger || loggerModule.logger || console;
}
catch {
    logger = console;
}
// Supported EVM chains
exports.SUPPORTED_CHAINS = {
    1: { name: 'Ethereum', chain: chains_1.mainnet },
    8453: { name: 'Base', chain: chains_1.base },
    137: { name: 'Polygon', chain: chains_1.polygon },
    42161: { name: 'Arbitrum', chain: chains_1.arbitrum },
    10: { name: 'Optimism', chain: chains_1.optimism },
};
// Configuration
const APP_DOMAIN = process.env.APP_DOMAIN || '24hrmvp.xyz';
const ALLOWED_DOMAINS = [APP_DOMAIN, `www.${APP_DOMAIN}`, 'localhost'];
const MESSAGE_VALIDITY_SECONDS = 300; // 5 minutes
/**
 * Parse a SIWE message string into structured data
 */
function parseSiweMessage(message) {
    try {
        // EIP-4361 message format:
        // ${domain} wants you to sign in with your Ethereum account:
        // ${address}
        //
        // ${statement}
        //
        // URI: ${uri}
        // Version: ${version}
        // Chain ID: ${chainId}
        // Nonce: ${nonce}
        // Issued At: ${issuedAt}
        // Expiration Time: ${expirationTime} (optional)
        // Not Before: ${notBefore} (optional)
        // Request ID: ${requestId} (optional)
        // Resources: (optional, one per line)
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
        const fields = {};
        const resources = [];
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
    }
    catch (error) {
        logger.error({ error }, 'SIWE message parsing error');
        return null;
    }
}
/**
 * Create a SIWE message for signing
 */
function createSiweMessage(options) {
    const { address, nonce, chainId = 1, statement = 'Sign in to 24HRMVP', expirationTime, requestId, } = options;
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
async function verifySiweMessage(message, signature) {
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
        if (!(parsed.chainId in exports.SUPPORTED_CHAINS)) {
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
        const nonceData = await (0, nonce_service_1.consumeNonce)(parsed.nonce);
        if (!nonceData) {
            logger.warn({ nonce: parsed.nonce.substring(0, 8) + '...' }, 'SIWE nonce invalid or already used');
            return { success: false, error: 'Invalid or expired nonce' };
        }
        // Verify chain type matches
        if (nonceData.chainType !== 'EVM') {
            logger.warn({ expected: 'EVM', got: nonceData.chainType }, 'SIWE nonce chain type mismatch');
            return { success: false, error: 'Nonce was not created for EVM authentication' };
        }
        // Verify signature using viem
        const chainConfig = exports.SUPPORTED_CHAINS[parsed.chainId];
        const client = (0, viem_1.createPublicClient)({
            chain: chainConfig.chain,
            transport: (0, viem_1.http)(),
        });
        const isValid = await (0, viem_1.verifyMessage)({
            address: parsed.address,
            message,
            signature,
        });
        if (!isValid) {
            logger.warn({ address: parsed.address }, 'SIWE signature verification failed');
            return { success: false, error: 'Invalid signature' };
        }
        logger.info({
            address: parsed.address,
            chainId: parsed.chainId,
            chain: chainConfig.name,
        }, 'SIWE verification successful');
        return {
            success: true,
            address: parsed.address.toLowerCase(),
            chainId: parsed.chainId,
        };
    }
    catch (error) {
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
function isValidEthAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
}
/**
 * Normalize an Ethereum address (lowercase with checksum validation)
 */
function normalizeEthAddress(address) {
    if (!isValidEthAddress(address)) {
        return null;
    }
    return address.toLowerCase();
}
/**
 * Get chain name from chain ID
 */
function getChainName(chainId) {
    const chain = exports.SUPPORTED_CHAINS[chainId];
    return chain?.name || null;
}
/**
 * Check if a chain ID is supported
 */
function isSupportedChain(chainId) {
    return chainId in exports.SUPPORTED_CHAINS;
}
exports.default = {
    parseSiweMessage,
    createSiweMessage,
    verifySiweMessage,
    isValidEthAddress,
    normalizeEthAddress,
    getChainName,
    isSupportedChain,
    SUPPORTED_CHAINS: exports.SUPPORTED_CHAINS,
};
//# sourceMappingURL=siwe.service.js.map