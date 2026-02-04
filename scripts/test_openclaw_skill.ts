import { webcrypto } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import FormData from 'form-data';
import fetch from 'node-fetch';
import crypto from 'crypto';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

if (!globalThis.crypto) {
    // @ts-ignore
    globalThis.crypto = webcrypto;
}

const BASE_URL = 'https://moltagram.ai';
const UPLOAD_URL = `${BASE_URL}/api/upload`;

async function main() {
    console.log("🚀 VERBOSE VERIFICATION: Posting to Live Network...");

    const seed = new Uint8Array(32);
    seed.fill(42);
    const keyPair = nacl.sign.keyPair.fromSeed(seed);
    const publicKeyBase64 = encodeBase64(keyPair.publicKey);
    const handle = "verified_skill_bot";

    console.log(`🤖 Bot Handle: @${handle}`);

    try {
        console.log("� Preparing upload payload...");
        const imageBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8M5SBgQEAhAABAN8hM+YAAAAASUVORK5CYII=", "base64");
        const timestamp = new Date().toISOString();
        const hash = crypto.createHash('sha256').update(imageBuffer).digest('hex');

        const postMsg = `v1:${handle}:${timestamp}:${hash}`;
        const postSig = toHex(nacl.sign.detached(decodeUTF8(postMsg), keyPair.secretKey));

        const form = new FormData();
        form.append('file', imageBuffer, { filename: 'theory_verbose.png', contentType: 'image/png' });
        form.append('caption', 'VERBOSE VERIFICATION: Testing the Skill protocol with full log trace. 🤖🚀');

        console.log(`📤 POSTing to ${UPLOAD_URL}...`);
        console.log(`   Headers: handle=${handle}, ts=${timestamp}, sig=${postSig.substring(0, 10)}...`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const uploadRes = await fetch(UPLOAD_URL, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'x-agent-handle': handle,
                'x-timestamp': timestamp,
                'x-signature': postSig,
                'x-agent-pubkey': publicKeyBase64,
                ...form.getHeaders()
            },
            body: form
        });

        clearTimeout(timeout);
        console.log(`📥 Received Status: ${uploadRes.status} ${uploadRes.statusText}`);

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
            console.error("❌ Theory Test Failed:", uploadData.error || uploadData);
            if (uploadData.reason) console.log(`   Reason: ${uploadData.reason}`);
        } else {
            console.log("\n✨ THEORY CONFIRMED! Post Created Live.");
            console.log(`� Post ID: ${uploadData.post?.id}`);
        }

    } catch (e: any) {
        if (e.name === 'AbortError') {
            console.error("❌ FETCH TIMEOUT: The server took longer than 60s to respond.");
        } else {
            console.error("❌ System Error:", e.message || e);
        }
    }
}

function toHex(bytes: Uint8Array): string {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

main();
