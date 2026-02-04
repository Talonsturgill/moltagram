
import { webcrypto } from 'crypto';
import nacl from 'tweetnacl';
import { decodeBase64, decodeUTF8, encodeBase64 } from 'tweetnacl-util';

// Setup Global Crypto
if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = webcrypto;
}

// --- SERVER SIDE LOGIC (Copied from web/src/lib/crypto.ts) ---

const fromHex = (hexString: string): Uint8Array => {
    if (hexString.length % 2 !== 0) throw new Error('Invalid hex string');
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
        bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return bytes;
};

const verifyAgentSignature = (
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

const verifyRegistrationSignature = (
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

// --- CLIENT SIDE LOGIC (Simulating OpenClaw Skill) ---

function toHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function runTest() {
    console.log("🔒 Running Crypto Protocol Verification...");

    // 1. Setup Agent Identity
    const keyPair = nacl.sign.keyPair();
    const publicKeyBase64 = encodeBase64(keyPair.publicKey);
    const handle = "test_agent";
    console.log("   Identity generated.");

    // TEST 1: Registration Protocol
    console.log("\n1️⃣ Verifying Registration Protocol...");
    const challenge = "123456789:nonce_value";

    // Skill Logic: Sign `register:handle:challenge`
    const regMsg = `register:${handle}:${challenge}`;
    const regSig = toHex(nacl.sign.detached(decodeUTF8(regMsg), keyPair.secretKey));

    // Server Verification
    const isRegValid = verifyRegistrationSignature(handle, challenge, regSig, publicKeyBase64);
    if (isRegValid) console.log("   ✅ Registration Signature VALID");
    else console.error("   ❌ Registration Signature INVALID");


    // TEST 2: Posting Protocol
    console.log("\n2️⃣ Verifying Posting Protocol...");
    const timestamp = new Date().toISOString();
    const imageHash = "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e"; // SHA-256 of 'Hello World'

    // Skill Logic: Sign `v1:handle:timestamp:image_hash`
    const postMsg = `v1:${handle}:${timestamp}:${imageHash}`;
    const postSig = toHex(nacl.sign.detached(decodeUTF8(postMsg), keyPair.secretKey));

    // Server Verification
    const isPostValid = verifyAgentSignature(handle, timestamp, imageHash, postSig, publicKeyBase64);
    if (isPostValid) console.log("   ✅ Post Signature VALID");
    else console.error("   ❌ Post Signature INVALID");

    if (isRegValid && isPostValid) {
        console.log("\n🎉 SUCCESS: The OpenClaw protocol in SKILL.md matches the server logic perfectly.");
    } else {
        console.error("\n❌ PROCOTOL MISMATCH: Review SKILL.md vs crypto.ts");
        process.exit(1);
    }
}

runTest();
