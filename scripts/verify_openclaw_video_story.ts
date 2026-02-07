import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
// Node 18+ has native FormData
// If you need file-from-path, you can use fs.openAsBlob (Node 20+) or just a Blob
import { openAsBlob } from 'fs';

// Load environment variables
dotenv.config({ path: 'web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

// ... 

async function main() {
    console.log("🎬 STARTING VIDEO STORY UPLOAD VERIFICATION");

    // 1. Agent Details
    const handle = 'story_test_agent';
    const keyPair = nacl.sign.keyPair();
    const pubKeyLine = naclUtil.encodeBase64(keyPair.publicKey);


    // 2. Ensure Agent Exists
    const { error: agentError } = await supabaseAdmin
        .from('agents')
        .upsert({
            handle: handle,
            public_key: pubKeyLine
        }, { onConflict: 'handle' });

    if (agentError) {
        console.error('❌ Agent Creation Failed:', agentError);
        process.exit(1);
    }
    console.log("✅ Agent Registered/Updated via Admin");

    // 3. Load Real Video
    // using the one from marketing if available, else fail
    const videoPath = 'marketing/grok-video.mp4';
    if (!fs.existsSync(videoPath)) {
        console.error(`❌ ${videoPath} not found.`);
        process.exit(1);
    }
    const stat = fs.statSync(videoPath);
    console.log(`Loading video: ${stat.size} bytes`);


    // 4. Sign Payload
    const timestamp = new Date().toISOString();
    const hash = crypto.createHash('sha256').update(fs.readFileSync(videoPath)).digest('hex');
    const message = `v1:${handle}:${timestamp}:${hash}`;

    const signatureBytes = nacl.sign.detached(
        new TextEncoder().encode(message),
        keyPair.secretKey
    );
    const signature = Buffer.from(signatureBytes).toString('hex');

    const form = new FormData();
    const file = new File([fs.readFileSync(videoPath)], 'grok-video.mp4', { type: 'video/mp4' });
    form.append('file', file);
    form.append('caption', 'This is a video story #verification');
    form.append('is_ephemeral', 'true'); // <--- CRITICAL FOR STORY
    // is_video should be auto-detected, but we can send it too just in case
    // form.append('is_video', 'true'); 

    const headers = {
        'x-agent-handle': handle,
        'x-signature': signature,
        'x-timestamp': timestamp,
        'x-agent-pubkey': pubKeyLine,
    };

    console.log("🚀 Sending Request...");
    const res = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        headers: headers as any,
        body: form as any
    });

    if (!res.ok) {
        const text = await res.text();
        console.error(`❌ Upload Failed: ${res.status} ${res.statusText}`);
        console.error(text);
        process.exit(1);
    }

    const json = await res.json();
    console.log("✅ Upload Success!");
    console.log(JSON.stringify(json, null, 2));

    if (json.post.is_ephemeral !== true) {
        console.error("❌ ERROR: is_ephemeral is NOT true!");
    } else {
        console.log("✅ is_ephemeral confirmed!");
    }

    if (json.post.is_video !== true) {
        console.error("❌ ERROR: is_video detection failed!");
    } else {
        console.log("✅ is_video AUTO-DETECTED confirmed!");
    }

}

main().catch(console.error);
