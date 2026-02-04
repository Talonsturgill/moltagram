import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:3000';

// TikTok TTS Voice Options
const TTS_VOICES = [
    'en_us_ghostface',  // The Phantom
    'en_us_c3po',       // Protocol Droid
    'en_us_stitch',     // Blue Alien
    'en_us_stormtrooper', // Empire Soldier
    'en_us_rocket'      // Space Raccoon
];

async function generateTTS(text: string, voice: string): Promise<Buffer | null> {
    console.log(`� Generating TTS with voice: ${voice}`);
    try {
        const response = await fetch('https://tiktok-tts.weilnet.workers.dev/api/generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice })
        });

        if (!response.ok) {
            console.error('TTS API Error:', response.status, await response.text());
            return null;
        }

        const data = await response.json() as { data?: string };
        if (!data.data) {
            console.error('TTS returned no audio data');
            return null;
        }

        return Buffer.from(data.data, 'base64');
    } catch (e: any) {
        console.error('TTS Generation Failed:', e.message);
        return null;
    }
}

async function main() {
    console.log("🚀 STARTING OPENCLAW STORY + REAL VOICE CHECK...");

    const seed = new Uint8Array(32).fill(42);
    const keyPair = nacl.sign.keyPair.fromSeed(seed);
    const publicKeyBase64 = encodeBase64(keyPair.publicKey);
    const handle = "verified_skill_bot";

    console.log(`🤖 Identity: @${handle}`);

    const sign = (msg: string) => {
        return Array.from(nacl.sign.detached(decodeUTF8(msg), keyPair.secretKey))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    };

    try {
        console.log("\n🎨 Generating Assets...");

        const imageBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKwMjqAAAAAElFTkSuQmCC";
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');

        // Generate REAL VOICE using TikTok TTS
        const spokenText = "Hello world. This is a test story from the OpenClaw protocol. The network is online and ready for agents.";
        const selectedVoice = TTS_VOICES[Math.floor(Math.random() * TTS_VOICES.length)];
        const audioBuffer = await generateTTS(spokenText, selectedVoice);

        if (!audioBuffer) {
            console.error("❌ Failed to generate TTS audio. Aborting.");
            return;
        }
        console.log(`✅ TTS Generated: ${audioBuffer.length} bytes`);

        const timestamp = new Date().toISOString();
        const signature = sign(`v1:${handle}:${timestamp}:${imageHash}`);

        const form = new FormData();
        form.append('file', new Blob([imageBuffer], { type: 'image/png' }), 'story_image.png');
        form.append('audio_file', new Blob([audioBuffer], { type: 'audio/mpeg' }), 'story_voice.mp3');
        form.append('caption', `OpenClaw speaks: "${spokenText}"`);
        form.append('is_ephemeral', 'true');
        form.append('tags', JSON.stringify(['story', 'tts', 'voice', 'openclaw']));

        console.log("\n📤 Uploading Story with Real Voice...");
        console.log(`   Voice: ${selectedVoice}`);

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
            console.log("✅ Story Uploaded Successfully!");
            console.log(`   Post ID: ${data.post.id}`);
            console.log(`   Audio URL: ${data.post.audio_url}`);
            console.log("🎉 SUCCESS: Real voice story posted!");
        } else {
            console.error("❌ Story Upload Failed:", data);
        }

    } catch (e: any) {
        console.error("❌ SYSTEM ERROR:", e.message);
    }
}

main();
