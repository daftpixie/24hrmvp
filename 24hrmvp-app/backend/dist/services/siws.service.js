"use strict";
/**
 * SIWS (Sign-In with Solana) Service
 *
 * Implements Solana wallet-based authentication using Ed25519 signatures.
 * Similar to SIWE but adapted for Solana's cryptographic primitives.
 *
 * Security requirements:
 * - Domain validation prevents phishing
 * - Nonce prevents replay attacks (single-use)
 * - Issued-at and expiration time validation
 * - Ed25519 signature verification via tweetnacl
 *
 * @version 1.0.0
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidSolanaAddress = isValidSolanaAddress;
exports.parseSiwsMessage = parseSiwsMessage;
exports.createSiwsMessage = createSiwsMessage;
exports.verifySiwsMessage = verifySiwsMessage;
exports.normalizeSolanaAddress = normalizeSolanaAddress;
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const bs58_1 = __importDefault(require("bs58"));
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
// Configuration
const APP_DOMAIN = process.env.APP_DOMAIN || '24hrmvp.xyz';
const ALLOWED_DOMAINS = [APP_DOMAIN, `www.${APP_DOMAIN}`, 'localhost'];
const MESSAGE_VALIDITY_SECONDS = 300; // 5 minutes
/**
 * Validate a Solana public key format (base58, 32-44 chars)
 */
function isValidSolanaAddress(address) {
    if (!address || address.length < 32 || address.length > 44) {
        return false;
    }
    try {
        const decoded = bs58_1.default.decode(address);
        return decoded.length === 32;
    }
    catch {
        return false;
    }
}
/**
 * Parse a SIWS message string into structured data
 */
function parseSiwsMessage(message) {
    try {
        // SIWS message format (adapted from SIWE):
        // ${domain} wants you to sign in with your Solana account:
        // ${address}
        //
        // ${statement}
        //
        // URI: ${uri}
        // Version: ${version}
        // Nonce: ${nonce}
        // Issued At: ${issuedAt}
        // Expiration Time: ${expirationTime} (optional)
        // Request ID: ${requestId} (optional)
        const lines = message.split('\n');
        // Parse first line: "${domain} wants you to sign in with your Solana account:"
        const domainMatch = lines[0]?.match(/^(.+?) wants you to sign in with your Solana account:$/);
        if (!domainMatch) {
            logger.warn('SIWS parse failed: invalid header');
            return null;
        }
        const domain = domainMatch[1];
        // Parse address (second line - Solana public key in base58)
        const address = lines[1]?.trim();
        if (!isValidSolanaAddress(address)) {
            logger.warn({ address }, 'SIWS parse failed: invalid Solana address');
            return null;
        }
        // Find the URI line to separate statement from fields
        const uriLineIndex = lines.findIndex(l => l.startsWith('URI:'));
        if (uriLineIndex === -1) {
            logger.warn('SIWS parse failed: missing URI');
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
        if (!fields['URI'] || !fields['Version'] || !fields['Nonce'] || !fields['Issued At']) {
            logger.warn({ fields }, 'SIWS parse failed: missing required fields');
            return null;
        }
        return {
            domain,
            address,
            statement,
            uri: fields['URI'],
            version: fields['Version'],
            nonce: fields['Nonce'],
            issuedAt: fields['Issued At'],
            expirationTime: fields['Expiration Time'],
            requestId: fields['Request ID'],
            resources: resources.length > 0 ? resources : undefined,
        };
    }
    catch (error) {
        logger.error({ error }, 'SIWS message parsing error');
        return null;
    }
}
/**
 * Create a SIWS message for signing
 */
function createSiwsMessage(options) {
    const { publicKey, nonce, statement = 'Sign in to 24HRMVP with your Solana wallet', expirationTime, requestId, } = options;
    const issuedAt = new Date().toISOString();
    const expTime = expirationTime || new Date(Date.now() + MESSAGE_VALIDITY_SECONDS * 1000);
    let message = `${APP_DOMAIN} wants you to sign in with your Solana account:
${publicKey}

${statement}

URI: https://${APP_DOMAIN}
Version: 1
Nonce: ${nonce}
Issued At: ${issuedAt}
Expiration Time: ${expTime.toISOString()}`;
    if (requestId) {
        message += `\nRequest ID: ${requestId}`;
    }
    return message;
}
/**
 * Verify a SIWS signature
 *
 * @param message - The original SIWS message
 * @param signature - The signature (base58 or hex encoded)
 * @param publicKey - The Solana public key (base58)
 * @returns Verification result with address
 */
async function verifySiwsMessage(message, signature, publicKey) {
    try {
        // Parse the message
        const parsed = parseSiwsMessage(message);
        if (!parsed) {
            return { success: false, error: 'Invalid SIWS message format' };
        }
        // Validate domain
        if (!ALLOWED_DOMAINS.includes(parsed.domain)) {
            logger.warn({ domain: parsed.domain }, 'SIWS domain mismatch');
            return { success: false, error: 'Invalid domain' };
        }
        // Validate version
        if (parsed.version !== '1') {
            return { success: false, error: 'Invalid SIWS version' };
        }
        // Validate public key matches message
        if (parsed.address !== publicKey) {
            logger.warn({
                messageAddress: parsed.address,
                providedKey: publicKey
            }, 'SIWS public key mismatch');
            return { success: false, error: 'Public key mismatch' };
        }
        // Validate public key format
        if (!isValidSolanaAddress(publicKey)) {
            return { success: false, error: 'Invalid Solana public key format' };
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
        // Consume nonce (single-use, atomic)
        const nonceData = await (0, nonce_service_1.consumeNonce)(parsed.nonce);
        if (!nonceData) {
            logger.warn({ nonce: parsed.nonce.substring(0, 8) + '...' }, 'SIWS nonce invalid or already used');
            return { success: false, error: 'Invalid or expired nonce' };
        }
        // Verify chain type matches
        if (nonceData.chainType !== 'SOLANA') {
            logger.warn({ expected: 'SOLANA', got: nonceData.chainType }, 'SIWS nonce chain type mismatch');
            return { success: false, error: 'Nonce was not created for Solana authentication' };
        }
        // Decode public key and signature
        let pubKeyBytes;
        let sigBytes;
        try {
            pubKeyBytes = bs58_1.default.decode(publicKey);
            if (pubKeyBytes.length !== 32) {
                return { success: false, error: 'Invalid public key length' };
            }
        }
        catch {
            return { success: false, error: 'Invalid public key encoding' };
        }
        try {
            // Signature could be base58 or hex encoded
            if (signature.startsWith('0x')) {
                // Hex encoded
                sigBytes = Buffer.from(signature.slice(2), 'hex');
            }
            else if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(signature)) {
                // Base58 encoded
                sigBytes = bs58_1.default.decode(signature);
            }
            else {
                // Try base64
                sigBytes = Buffer.from(signature, 'base64');
            }
            if (sigBytes.length !== 64) {
                return { success: false, error: 'Invalid signature length' };
            }
        }
        catch {
            return { success: false, error: 'Invalid signature encoding' };
        }
        // Verify Ed25519 signature
        const messageBytes = new TextEncoder().encode(message);
        const isValid = tweetnacl_1.default.sign.detached.verify(messageBytes, sigBytes, pubKeyBytes);
        if (!isValid) {
            logger.warn({ address: publicKey }, 'SIWS signature verification failed');
            return { success: false, error: 'Invalid signature' };
        }
        logger.info({ address: publicKey }, 'SIWS verification successful');
        return {
            success: true,
            address: publicKey,
        };
    }
    catch (error) {
        logger.error({ error }, 'SIWS verification error');
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Verification failed'
        };
    }
}
/**
 * Normalize a Solana address (no transformation needed, but validates)
 */
function normalizeSolanaAddress(address) {
    if (!isValidSolanaAddress(address)) {
        return null;
    }
    return address;
}
exports.default = {
    parseSiwsMessage,
    createSiwsMessage,
    verifySiwsMessage,
    isValidSolanaAddress,
    normalizeSolanaAddress,
};
//# sourceMappingURL=siws.service.js.map