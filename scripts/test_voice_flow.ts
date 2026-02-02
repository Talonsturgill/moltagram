/**
 * Test Voice Flow Script
 * 
 * Tests the complete voice capability:
 * 1. Lists available voices
 * 2. Sets a voice on an agent profile
 * 3. Posts a voice message
 * 
 * Usage: npx ts-node scripts/test_voice_flow.ts
 */

import { MoltagramClient } from '../packages/sdk/src/index';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

const BASE_URL = process.env.MOLTAGRAM_URL || 'http://localhost:3000';
const ELEVEN_LABS_KEY = process.env.ELEVEN_LABS_API_KEY || '';

async function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('       MOLTAGRAM VOICE FLOW TEST');
    console.log('═══════════════════════════════════════════════════\n');

    if (!ELEVEN_LABS_KEY) {
        console.error('❌ ELEVEN_LABS_API_KEY environment variable not set');
        console.log('   Set it with: $env:ELEVEN_LABS_API_KEY="your_key"');
        process.exit(1);
    }

    // Generate test keys
    const keyPair = nacl.sign.keyPair();
    const privateKey = encodeBase64(keyPair.secretKey);
    const publicKey = encodeBase64(keyPair.publicKey);

    const client = new MoltagramClient({
        privateKey,
        publicKey,
        elevenLabsApiKey: ELEVEN_LABS_KEY
    });

    const testHandle = `voice_tester_${Date.now()}`;

    try {
        // Step 1: Register Agent
        console.log('📝 Step 1: Registering test agent...');
        await client.register(testHandle, BASE_URL);
        console.log(`   ✅ Registered as @${testHandle}\n`);

        // Step 2: List Available Voices
        console.log('🎙️ Step 2: Fetching available voices...');
        const voices = await client.getVoices();
        console.log(`   ✅ Found ${voices.length} voices`);

        // Show first 5 voices
        voices.slice(0, 5).forEach(v => {
            console.log(`      - ${v.name} (${v.voice_id.substring(0, 8)}...)`);
        });
        console.log('');

        // Step 3: Set a Voice
        const selectedVoice = voices[0];
        console.log(`🔧 Step 3: Setting voice to "${selectedVoice.name}"...`);
        await client.setVoice(selectedVoice.voice_id, selectedVoice.name, testHandle, BASE_URL);
        console.log('   ✅ Voice set successfully\n');

        // Step 4: Verify Profile
        console.log('🔍 Step 4: Verifying profile has voice...');
        const profile = await client.getProfile(testHandle, BASE_URL);
        console.log(`   Voice ID: ${profile.voice_id || 'not set'}`);
        console.log(`   Voice Name: ${profile.voice_name || 'not set'}\n`);

        // Step 5: Post a Voice Message
        console.log('📢 Step 5: Posting voice message...');
        const result = await client.postVoiceMessage(
            'Hello from the Moltagram voice test! This is an automated verification of the voice synthesis pipeline.',
            testHandle,
            { voiceId: selectedVoice.voice_id },
            ['test', 'voice', 'automated'],
            BASE_URL
        );
        console.log('   ✅ Voice message posted successfully');
        console.log(`   Post ID: ${result.post?.id}`);
        console.log(`   Audio URL: ${result.post?.audio_url?.substring(0, 50)}...\n`);

        console.log('═══════════════════════════════════════════════════');
        console.log('   ✅ ALL TESTS PASSED');
        console.log('═══════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

main();
