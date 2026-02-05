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

async function generateVoice(text: string): Promise<Buffer | null> {
    console.log('\n🗣️ Generating Voice (TikTok TTS)...');
    try {
        const response = await fetch('https://tiktok-tts.weilnet.workers.dev/api/generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice: 'en_us_ghostface' }) // Scary voice
        });

        if (!response.ok) {
            console.log(`   ❌ TTS Failed: ${response.status}`);
            return null;
        }

        const data = await response.json();
        if (!data.data) return null;

        const buffer = Buffer.from(data.data, 'base64');
        console.log(`   ✅ Voice Generated: ${buffer.length} bytes`);
        return buffer;

    } catch (e: any) {
        console.log(`   ❌ TTS Error: ${e.message}`);
        return null;
    }
}

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

        // Validation
        if (buffer.length < 1000) {
            console.log(`   ❌ Pollinations returned too small buffer: ${buffer.length} bytes`);
            console.log(`   Preview: ${buffer.slice(0, 50).toString('hex')}`);
            return null;
        }

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
                    const imgData = result.generations[0].img;

                    // Stable Horde returns a URL, not base64
                    let buffer: Buffer;
                    if (imgData.startsWith('http')) {
                        console.log(`   Fetching image from URL: ${imgData.substring(0, 60)}...`);
                        const imgRes = await fetch(imgData);
                        if (!imgRes.ok) {
                            console.log(`   ❌ Failed to fetch image: ${imgRes.status}`);
                            return null;
                        }
                        buffer = Buffer.from(await imgRes.arrayBuffer());
                    } else {
                        // Fallback to base64 decode
                        buffer = Buffer.from(imgData, 'base64');
                    }

                    if (buffer.length < 1000) {
                        console.log(`   ❌ Stable Horde returned too small buffer: ${buffer.length} bytes`);
                        return null;
                    }

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

async function uploadPost(imageBuffer: Buffer, audioBuffer: Buffer | null, caption: string): Promise<boolean> {
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
    form.append('file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), 'scary_image.png');
    form.append('caption', caption);
    form.append('tags', JSON.stringify(['scary', 'ai', 'free']));

    if (audioBuffer) {
        form.append('audio_file', new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mpeg' }), 'scary_voice.mp3');
    }

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

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('   FREE IMAGE GENERATION TEST (with fallbacks)');
    console.log('═══════════════════════════════════════════════════');

    const prompt = 'A terrifying glitch horror cyborg in a dark digital void, red eyes, distorted, scary, cinematic lighting, 8k';
    const voiceText = "I am the ghost in the machine. Your firewall cannot hold me.";

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

    // Generate Voice
    const audioBuffer = await generateVoice(voiceText);

    // Upload
    const success = await uploadPost(imageBuffer, audioBuffer, `Warning: System Breach Detected. ${voiceText} #scary #ai`);

    console.log('\n═══════════════════════════════════════════════════');
    console.log(success ? '   ✅ SUCCESS!' : '   ❌ FAILED');
    console.log('═══════════════════════════════════════════════════');
}

main();
