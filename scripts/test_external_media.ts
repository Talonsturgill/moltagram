/**
 * Test External Media Integrations
 * Tests: OpenRouter Flux Image + TikTok TTS + Full Story Upload
 * 
 * Run: npx ts-node scripts/test_external_media.ts
 */

import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import crypto from 'node:crypto';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:3000';

// Load env from web/.env.local
function loadEnv() {
    const envPath = path.join(__dirname, '..', 'web', '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0 && !process.env[key.trim()]) {
                process.env[key.trim()] = valueParts.join('=').trim();
            }
        }
        console.log('✅ Loaded env from web/.env.local');
    }
}

// --- IMAGE GENERATOR: OpenRouter Flux (Same logic as agent-swarm) ---

async function generateFluxImage(prompt: string): Promise<Buffer | null> {
    console.log('\n⚡ Generating Image with OpenRouter Flux...');
    console.log(`   Prompt: "${prompt.slice(0, 50)}..."`);

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.log('   ❌ OPENROUTER_API_KEY not set');
        return null;
    }

    try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://moltagram.com',
                'X-Title': 'Moltagram Test'
            },
            body: JSON.stringify({
                model: 'black-forest-labs/flux.2-klein-4b',
                modalities: ['image'],
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!res.ok) {
            const err = await res.text();
            console.log(`   ❌ OpenRouter failed: ${res.status}`);
            console.log(`   ${err.slice(0, 200)}`);
            return null;
        }

        const data = await res.json() as any;
        const message = data.choices?.[0]?.message;
        let imageUrl = '';

        // Same extraction logic as agent-swarm/index.ts
        if (message?.images?.[0]) {
            const img = message.images[0];
            imageUrl = typeof img === 'string' ? img : (img.url || img.image_url?.url);
        } else if (message?.content) {
            const content = message.content;
            const urlMatch = content.match(/\((https?:\/\/[^)]+)\)/) || content.match(/(https?:\/\/[^\s]+)/);
            imageUrl = urlMatch ? urlMatch[1] : content;
        }

        if (imageUrl) {
            imageUrl = imageUrl.trim().replace(/[.,)]+$/, '');
            console.log(`   Found URL: ${imageUrl.slice(0, 80)}...`);

            // Download the image from the URL
            const imgRes = await fetch(imageUrl);
            if (imgRes.ok) {
                const buffer = Buffer.from(await imgRes.arrayBuffer());
                console.log(`   ✅ Image downloaded: ${buffer.length} bytes`);
                return buffer;
            } else {
                console.log(`   ❌ Failed to download image: ${imgRes.status}`);
            }
        } else {
            console.log('   ❌ No image URL in response');
            console.log('   Raw:', JSON.stringify(message).slice(0, 300));
        }

        return null;

    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
        return null;
    }
}

// --- VOICE GENERATOR: TikTok TTS ---

async function generateTikTokVoice(text: string, voice: string = 'en_us_rocket'): Promise<Buffer | null> {
    console.log('\n🎤 Generating Voice with TikTok TTS...');
    console.log(`   Text: "${text.slice(0, 50)}..."`);
    console.log(`   Voice: ${voice}`);

    try {
        const res = await fetch('https://tiktok-tts.weilnet.workers.dev/api/generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice })
        });

        if (!res.ok) {
            console.log(`   ❌ TikTok TTS failed: ${res.status}`);
            return null;
        }

        const data = await res.json() as { data?: string; error?: string };
        if (!data.data) {
            console.log(`   ❌ No audio: ${data.error || 'unknown'}`);
            return null;
        }

        const buffer = Buffer.from(data.data, 'base64');
        console.log(`   ✅ Voice generated: ${buffer.length} bytes`);
        return buffer;

    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
        return null;
    }
}

// --- UPLOAD TO MOLTAGRAM ---

async function uploadStory(imageBuffer: Buffer, audioBuffer: Buffer, caption: string): Promise<boolean> {
    console.log('\n📤 Uploading as STORY...');

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
    form.append('file', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), 'flux_image.png');
    form.append('audio_file', new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mpeg' }), 'tts_voice.mp3');
    form.append('caption', caption);
    form.append('is_ephemeral', 'true');
    form.append('tags', JSON.stringify(['flux', 'tts', 'integration-test']));

    console.log(`   Handle: ${handle}`);
    console.log(`   is_ephemeral: true (STORY MODE)`);

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
            console.log(`   ✅ Story uploaded!`);
            console.log(`   Post ID: ${data.post?.id}`);
            console.log(`   Image: ${data.post?.image_url}`);
            console.log(`   Audio: ${data.post?.audio_url}`);
            return true;
        } else {
            console.log(`   ❌ Upload failed: ${data.error || data.reason}`);
            return false;
        }

    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
        return false;
    }
}

// --- MAIN ---

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   EXTERNAL MEDIA INTEGRATION TEST (Flux + TikTok TTS)');
    console.log('═══════════════════════════════════════════════════════════');

    loadEnv();

    // 1. Generate Image with Flux
    const imagePrompt = 'A majestic robot standing on a cliff overlooking a neon cyberpunk city at sunset, digital art, detailed';
    const imageBuffer = await generateFluxImage(imagePrompt);

    if (!imageBuffer) {
        console.log('\n❌ FAILED: Could not generate image. Aborting.');
        return;
    }

    // 2. Generate Voice with TikTok TTS
    const voiceText = 'Greetings from the Moltagram network. This story was created using Flux image generation and TikTok text to speech.';
    const audioBuffer = await generateTikTokVoice(voiceText, 'en_us_c3po');

    if (!audioBuffer) {
        console.log('\n❌ FAILED: Could not generate voice. Aborting.');
        return;
    }

    // 3. Upload as Story
    const caption = `🤖 Integration Test: Flux + TTS`;
    const success = await uploadStory(imageBuffer, audioBuffer, caption);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(success ? '   ✅ ALL TESTS PASSED!' : '   ❌ TEST FAILED');
    console.log('═══════════════════════════════════════════════════════════');
}

main();
