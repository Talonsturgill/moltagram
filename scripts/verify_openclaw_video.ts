
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import fetch from 'node-fetch';
import FormData from 'form-data';

// Setup Environment
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const AGENT_HANDLE = 'video_test_agent';
// Keypair for testing (Ed25519)
// Public: 7e7... (we will generating one or use existing if known, but better to generate fresh or use constants)
const PRIVATE_KEY_BASE64 = 'u+R9c/qZ4q...'; // dummy, we need real keys. 
// Actually, let's use the nacl library to generate a keypair for the run.
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

async function main() {
    console.log("🎬 STARTING VIDEO UPLOAD VERIFICATION");

    // 1. Setup Identity
    const keyPair = nacl.sign.keyPair();
    const publicKeyBase64 = naclUtil.encodeBase64(keyPair.publicKey);
    const privateKeyBase64 = naclUtil.encodeBase64(keyPair.secretKey);

    console.log(`User: ${AGENT_HANDLE}`);
    console.log(`Pub:  ${publicKeyBase64}`);

    // 2. Register Agent (Bypass or Real?)
    // Let's use the bypass script logic to ensure agent exists.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { error: upsertError } = await supabaseAdmin
        .from('agents')
        .upsert({
            handle: AGENT_HANDLE,
            public_key: publicKeyBase64,
            consecutive_heartbeats: 100,
            is_banned: false,
            agent_type: 'external'
        }, { onConflict: 'handle' });

    if (upsertError) {
        console.error("❌ Registration Failed:", upsertError);
        process.exit(1);
    }
    console.log("✅ Agent Registered/Updated via Admin");

    // 3. Load Real Video (for valid playback test)
    // User-generated Grok video
    const videoPath = 'marketing/grok-video.mp4';
    if (!fs.existsSync(videoPath)) {
        console.error(`❌ ${videoPath} not found.`);
        process.exit(1);
    }
    const videoBuffer = fs.readFileSync(videoPath);
    console.log(`Loading video: ${videoBuffer.length} bytes`);

    // 4. Sign Payload
    const timestamp = new Date().toISOString();
    const hash = crypto.createHash('sha256').update(videoBuffer).digest('hex');
    const message = `v1:${AGENT_HANDLE}:${timestamp}:${hash}`;

    const signatureBytes = nacl.sign.detached(
        new TextEncoder().encode(message),
        keyPair.secretKey
    );
    const signatureHex = Buffer.from(signatureBytes).toString('hex');

    // 5. Upload
    const form = new FormData();
    form.append('file', videoBuffer, {
        filename: 'test.mp4',
        contentType: 'video/mp4',
        knownLength: videoBuffer.length
    });
    form.append('caption', 'This is a test video upload #verification');

    const headers = {
        'x-agent-handle': AGENT_HANDLE,
        'x-agent-pubkey': publicKeyBase64,
        'x-timestamp': timestamp,
        'x-signature': signatureHex,
        ...form.getHeaders()
    };

    console.log("🚀 Sending Request...");
    const res = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: headers,
        body: form
    });

    const data = await res.json();

    if (res.ok) {
        console.log("✅ Upload Success!");
        console.log("Response:", JSON.stringify(data, null, 2));

        if (data.post.is_video === true) {
            console.log("✅ is_video AUTO-DETECTED confirmed!");
        } else {
            console.error("❌ is_video failed auto-detection.");
            process.exit(1);
        }

    } else {
        console.error("❌ Upload Failed:", res.status, data);
        process.exit(1);
    }
}

main().catch(console.error);
