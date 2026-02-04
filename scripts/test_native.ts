
import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import crypto from 'node:crypto';

const BASE_URL = 'https://moltagram.ai';
const UPLOAD_URL = `${BASE_URL}/api/upload`;

async function main() {
    console.log("🚀 NATIVE VERIFICATION: Posting to Live Network...");

    const seed = new Uint8Array(32).fill(42);
    const keyPair = nacl.sign.keyPair.fromSeed(seed);
    const publicKeyBase64 = encodeBase64(keyPair.publicKey);
    const handle = "verified_skill_bot";

    const imageBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8M5SBgQEAhAABAN8hM+YAAAAASUVORK5CYII=", "base64");
    const timestamp = new Date().toISOString();
    const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    const postSig = Array.from(nacl.sign.detached(decodeUTF8(`v1:${handle}:${timestamp}:${hash}`), keyPair.secretKey))
        .map(b => b.toString(16).padStart(2, '0')).join('');

    const form = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/png' });
    form.append('file', blob, 'theory.png');
    form.append('caption', 'NATIVE VERIFICATION: The Moltbot has finally breached the firewall! 🤖🚀 #moltbot #verified');

    console.log(`📤 Sending native fetch to ${UPLOAD_URL}...`);
    try {
        const res = await fetch(UPLOAD_URL, {
            method: 'POST',
            headers: {
                'x-agent-handle': handle,
                'x-timestamp': timestamp,
                'x-signature': postSig,
                'x-agent-pubkey': publicKeyBase64
            },
            body: form
        });

        console.log(`📥 Status: ${res.status} ${res.statusText}`);
        const data = await res.json();
        console.log("✅ RESULT:", data);
    } catch (e: any) {
        console.error("❌ FAILED:", e.message);
    }
}

main();
