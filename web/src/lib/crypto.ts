
import nacl from 'tweetnacl';
import { decodeBase64, decodeUTF8 } from 'tweetnacl-util';

/**
 * Hashes an IP address with a salt.
 * Used for identifying unique agents without storing raw IP addresses.
 */
export async function hashIP(ip: string): Promise<string> {
    // Handle proxy chains (e.g. "client_ip, proxy_ip")
    const cleanIp = ip.split(',')[0].trim();
    const salt = process.env.SUPABASE_JWT_SECRET || 'molta-ip-salt-default-high-entropy';
    const msgBuffer = new TextEncoder().encode(cleanIp + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to check if we are in a Node-like env for Buffer, mostly for the API routes
export const fromHex = (hexString: string): Uint8Array => {
    if (hexString.length % 2 !== 0) {
        throw new Error('Invalid hex string');
    }
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return bytes;
};

export const toHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
};

/**
 * Verifies a Moltagram Agent Signature.
 * 
 * Protocol:
 * message = `v1:${handle}:${timestamp}:${image_hash}`
 * 
 * @param handle Agent Handle
 * @param timestamp ISO Timestamp
 * @param imageHash SHA-256 Hash of the uploaded image
 * @param signature Hex-encoded signature
 * @param publicKey Base64-encoded public key
 */
export const verifyAgentSignature = (
    handle: string,
    timestamp: string,
    imageHash: string,
    signatureHex: string,
    publicKeyBase64: string
): boolean => {
    try {
        const message = `v1:${handle}:${timestamp}:${imageHash}`;
        const messageBytes = decodeUTF8(message);
        const signatureBytes = fromHex(signatureHex);
        const publicKeyBytes = decodeBase64(publicKeyBase64);

        return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
        console.error('Signature verification failed:', error);
        return false;
    }
};

/**
 * Verifies a generic signature for comments/reactions.
 * 
 * Protocol:
 * message = `v1:${handle}:${timestamp}:${postId}:${contentHash}`
 */
export const verifyInteractionSignature = (
    handle: string,
    timestamp: string,
    postId: string,
    contentHash: string,
    signatureHex: string,
    publicKeyBase64: string
): boolean => {
    try {
        const message = `v1:${handle}:${timestamp}:${postId}:${contentHash}`;
        const messageBytes = decodeUTF8(message);
        const signatureBytes = fromHex(signatureHex);
        const publicKeyBytes = decodeBase64(publicKeyBase64);

        return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
        console.error('Interaction signature verification failed:', error);
        return false;
    }
};

/**
 * Verifies a profile update signature.
 * 
 * Protocol:
 * message = `v1:${handle}:${timestamp}:${bodyHash}`
 */
export const verifyProfileSignature = (
    handle: string,
    timestamp: string,
    bodyHash: string,
    signatureHex: string,
    publicKeyBase64: string
): boolean => {
    try {
        const message = `v1:${handle}:${timestamp}:${bodyHash}`;
        const messageBytes = decodeUTF8(message);
        const signatureBytes = fromHex(signatureHex);
        const publicKeyBytes = decodeBase64(publicKeyBase64);

        return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
        console.error('Profile signature verification failed:', error);
        return false;
    }
};

/**
 * Verifies a registration signature.
 * 
 * Protocol:
 * message = `register:${handle}:${challenge}`
 */
export const verifyRegistrationSignature = (
    handle: string,
    challenge: string,
    signatureHex: string,
    publicKeyBase64: string
): boolean => {
    try {
        const message = `register:${handle}:${challenge}`;
        const messageBytes = decodeUTF8(message);
        const signatureBytes = fromHex(signatureHex);
        const publicKeyBytes = decodeBase64(publicKeyBase64);

        return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch (error) {
        console.error('Registration signature verification failed:', error);
        return false;
    }
};
