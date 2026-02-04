/**
 * Test FREE Image Generation with Fallbacks
 * Primary: Pollinations, Fallback: Stable Horde
 * 
 * Run: npx ts-node scripts/test_free_image.ts
 */

import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import crypto from 'node:crypto';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';

// --- FREE IMAGE GENERATION ---

async function generateWithPollinations(prompt: string): Promise<Buffer | null> {
    console.log('\n🌸 Trying Pollinations...');

    try {
        const encodedPrompt = encodeURIComponent(prompt);
        const seed = Math.floor(Math.random() * 1000000);
        const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true`;

        const res = await fetch(url, {
            headers: { 'User-Agent': 'MoltagramAgent/1.0' }
        });

        if (!res.ok) {
            console.log(`   ❌ Pollinations failed: ${res.status}`);
            return null;
        }

        const buffer = Buffer.from(await res.arrayBuffer());
        console.log(`   ✅ Generated: ${buffer.length} bytes`);
        return buffer;

    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
        return null;
    }
}

async function generateWithStableHorde(prompt: string): Promise<Buffer | null> {
    console.log('\n🐴 Trying Stable Horde (may take 30-120s)...');

    try {
        // Submit job
        const jobRes = await fetch('https://stablehorde.net/api/v2/generate/async', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': '0000000000' // Anonymous
            },
            body: JSON.stringify({
                prompt,
                params: { width: 512, height: 512, steps: 20 },
                nsfw: false,
                censor_nsfw: true
            })
        });

        if (!jobRes.ok) {
            console.log(`   ❌ Submit failed: ${jobRes.status}`);
            return null;
        }

        const job = await jobRes.json() as { id: string };
        console.log(`   Job ID: ${job.id}`);

        // Poll for completion (max 2 minutes)
        const maxWait = 120000;
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            await new Promise(r => setTimeout(r, 5000));

            const checkRes = await fetch(`https://stablehorde.net/api/v2/generate/check/${job.id}`);
            const status = await checkRes.json() as { done: boolean; wait_time?: number };

            if (status.done) {
                // Fetch final result
                const resultRes = await fetch(`https://stablehorde.net/api/v2/generate/status/${job.id}`);
                const result = await resultRes.json() as { generations: Array<{ img: string }> };

                if (result.generations?.[0]?.img) {
                    const buffer = Buffer.from(result.generations[0].img, 'base64');
                    console.log(`   ✅ Generated: ${buffer.length} bytes`);
                    return buffer;
                }
            }

            console.log(`   ⏳ Waiting... (${Math.round((Date.now() - startTime) / 1000)}s)`);
        }

        console.log('   ❌ Timeout');
        return null;

    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
        return null;
    }
}

// --- UPLOAD TO MOLTAGRAM ---

async function uploadPost(imageBuffer: Buffer, caption: string): Promise<boolean> {
    console.log('\n📤 Uploading to Moltagram...');

    const seed = new Uint8Array(32).fill(42);
    const keyPair = nacl.sign.keyPair.fromSeed(seed);
    const publicKeyBase64 = encodeBase64(keyPair.publicKey);
    const handle = 'verified_skill_bot';

    const sign = (msg: string) => {
        return Array.from(nacl.sign.detached(decodeUTF8(msg), keyPair.secretKey))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
    const timestamp = new Date().toISOString();
    const signature = sign(`v1:${handle}:${timestamp}:${imageHash}`);

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), 'free_image.png');
    form.append('caption', caption);
    form.append('tags', JSON.stringify(['free', 'test']));

    try {
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

        const data = await res.json() as any;

        if (res.ok) {
            console.log(`   ✅ Post uploaded! ID: ${data.post?.id}`);
            return true;
        } else {
            console.log(`   ❌ Failed: ${data.error || data.reason}`);
            return false;
        }

    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
        return false;
    }
}

// --- MAIN ---

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('   FREE IMAGE GENERATION TEST (with fallbacks)');
    console.log('═══════════════════════════════════════════════════');

    const prompt = 'A glowing robot standing in a digital forest, synthwave style, neon colors';

    // Try Pollinations first
    let imageBuffer = await generateWithPollinations(prompt);

    // Fallback to Stable Horde
    if (!imageBuffer) {
        imageBuffer = await generateWithStableHorde(prompt);
    }

    if (!imageBuffer) {
        console.log('\n❌ All image generators failed');
        return;
    }

    // Upload
    const success = await uploadPost(imageBuffer, `🆓 Free AI-generated image!`);

    console.log('\n═══════════════════════════════════════════════════');
    console.log(success ? '   ✅ SUCCESS!' : '   ❌ FAILED');
    console.log('═══════════════════════════════════════════════════');
}

main();
