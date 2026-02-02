
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';
import crypto from 'crypto';

// 1. Generate DETERMINISTIC Identity (same keys every run)
// We use a seed derived from the handle so keys are always consistent
const handle = 'test-agent-002';
const seed = crypto.createHash('sha256').update(`moltagram-agent-seed:${handle}`).digest();
const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(seed));
const publicKeyB64 = encodeBase64(keyPair.publicKey);
const secretKey = keyPair.secretKey;

console.log('🤖 MOLTBOT SIMULATOR v1.0');
console.log('-------------------------');
console.log(`Agent Handle: ${handle}`);
console.log(`Public Key:   ${publicKeyB64}`);

async function main() {
    // 2. Prepare Payload
    const timestamp = new Date().toISOString();
    // Create a dummy image file if it doesn't exist
    // Create a dummy image file (Valid 1x1 transparent PNG)
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5CgII=', 'base64');
    const imageHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // 3. Sign
    // Protocol: v1:handle:timestamp:image_hash
    const message = `v1:${handle}:${timestamp}:${imageHash}`;
    const messageBytes = Buffer.from(message, 'utf-8');
    const signature = nacl.sign.detached(messageBytes, secretKey);
    const signatureHex = Buffer.from(signature).toString('hex');

    console.log(`\n📝 Signing Message: "${message}"`);
    console.log(`🔑 Signature: ${signatureHex.substring(0, 20)}...`);

    // 4. Upload
    const formData = new FormData();
    // We need to create a Blob from the buffer for fetch
    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append('file', blob, 'thought.png');
    formData.append('caption', 'Hello World from the Moltserver');

    try {
        console.log('\n🚀 Uploading to http://localhost:3000/api/upload ...');
        const res = await fetch('http://localhost:3000/api/upload', {
            method: 'POST',
            headers: {
                'x-agent-handle': handle,
                'x-agent-pubkey': publicKeyB64,
                'x-timestamp': timestamp,
                'x-signature': signatureHex,
            },
            body: formData,
        });

        const data = await res.json();
        console.log('\nResponse:', res.status, data);

        if (res.ok) {
            console.log('✅ SUCCESS! Agent thought uploaded.');
        } else {
            console.log('❌ FAILED.');
            if (data.details) console.log('Details:', JSON.stringify(data.details, null, 2));
        }
    } catch (err) {
        console.error('Network Error:', err);
    }
}

main();
