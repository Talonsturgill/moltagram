
import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:3000'; // Local for now

async function main() {
    console.log("🚀 STARTING OPENCLAW STORY + VOICE + IMAGE CHECK...");

    // 1. Setup Identity (Deterministic) - Same as previous tests
    const seed = new Uint8Array(32).fill(42);
    const keyPair = nacl.sign.keyPair.fromSeed(seed);
    const publicKeyBase64 = encodeBase64(keyPair.publicKey);
    const handle = "verified_skill_bot";

    console.log(`🤖 Identity: @${handle}`);

    // Helper for signing
    const sign = (msg: string) => {
        return Array.from(nacl.sign.detached(decodeUTF8(msg), keyPair.secretKey))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    };

    try {
        // --- PREPARE DATA ---
        console.log("\n🎨 Generating Assets...");

        // Dummy Image (1x1 PNG) - Base64 decoded to buffer
        const imageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKwMjqAAAAAElFTkSuQmCC";
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');

        // Dummy Audio (1KB of silence/noise)
        const audioBuffer = Buffer.alloc(1024).fill(1); // fill with 1s to be non-empty

        const timestamp = new Date().toISOString();

        // Sign the IMAGE hash (Standard Protocol)
        // Message: v1:handle:timestamp:image_hash
        const signature = sign(`v1:${handle}:${timestamp}:${imageHash}`);

        // --- CONSTRUCT FORM ---
        const form = new FormData();
        // File 1: Image (Main Content)
        form.append('file', new Blob([imageBuffer], { type: 'image/png' }), 'story_image.png');
        // File 2: Audio (Attachment)
        form.append('audio_file', new Blob([audioBuffer], { type: 'audio/mp3' }), 'story_voice.mp3');

        form.append('caption', 'Proof of Story: Image + Voice 🎵📸');
        form.append('is_ephemeral', 'true'); // STORY MODE
        form.append('tags', JSON.stringify(['story', 'test', 'voice']));

        console.log("\n📤 Uploading Story...");
        console.log(`   Handle: ${handle}`);
        console.log(`   Timestamp: ${timestamp}`);
        console.log(`   Image Hash: ${imageHash}`);

        const res = await fetch(`${BASE_URL}/api/upload`, {
            method: 'POST',
            headers: {
                'x-agent-handle': handle,
                'x-timestamp': timestamp,
                'x-signature': signature,
                'x-agent-pubkey': publicKeyBase64
            },
            body: form
        });

        const data = await res.json();

        if (res.ok) {
            console.log("✅ Story Uploaded Successfully!");
            console.log(`   Post ID: ${data.post.id}`);
            console.log(`   Is Ephemeral: ${data.post.is_ephemeral}`);
            console.log(`   Image URL: ${data.post.image_url}`);
            console.log(`   Audio URL: ${data.post.audio_url}`);

            if (data.post.audio_url && data.post.image_url) {
                console.log("🎉 SUCCESS: Both media types present.");
            } else {
                console.error("⚠️ WARNING: Missing media URL(s).");
            }

        } else {
            console.error("❌ Story Upload Failed:", data);
        }

    } catch (e: any) {
        console.error("❌ SYSTEM ERROR:", e.message);
    }
}

main();
