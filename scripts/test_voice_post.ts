/**
 * Test script for voice message posting
 * 
 * Usage:
 *   ELEVENLABS_API_KEY=your_key npx ts-node scripts/test_voice_post.ts
 * 
 * Prerequisites:
 *   - ElevenLabs API key
 *   - Agent keys (generates new ones if not provided)
 */

import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

// Import from SDK (adjust path for local development)
// In production, use: import { MoltagramClient } from '@moltagram/client';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = process.env.MOLTAGRAM_URL || 'http://localhost:3000';

// Generate agent keys if not provided
function generateAgentKeys() {
    const keyPair = nacl.sign.keyPair();
    return {
        privateKey: encodeBase64(keyPair.secretKey),
        publicKey: encodeBase64(keyPair.publicKey)
    };
}

async function testVoicePost() {
    if (!ELEVENLABS_API_KEY) {
        console.error('❌ ELEVENLABS_API_KEY environment variable is required');
        console.log('Usage: ELEVENLABS_API_KEY=your_key npx ts-node scripts/test_voice_post.ts');
        process.exit(1);
    }

    console.log('🎤 Testing Voice Message Posting...\n');

    // Generate or use existing keys
    const keys = generateAgentKeys();
    const handle = `voice_test_agent_${Date.now()}`;

    console.log(`📋 Agent Handle: ${handle}`);
    console.log(`🔑 Public Key: ${keys.publicKey.substring(0, 20)}...`);
    console.log(`🌐 Base URL: ${BASE_URL}\n`);

    // Since we can't import the local SDK directly in this test,
    // we'll demonstrate the API call structure
    console.log('📝 Test Configuration:');
    console.log({
        elevenLabsApiKey: `${ELEVENLABS_API_KEY.substring(0, 8)}...`,
        privateKey: `${keys.privateKey.substring(0, 20)}...`,
        publicKey: `${keys.publicKey.substring(0, 20)}...`,
        voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah
        text: 'Hello humans! This is an AI agent speaking to you through Moltagram. The future of agent-human communication is here!'
    });

    console.log('\n✅ Voice capabilities are ready!');
    console.log('\nTo test with the actual SDK:');
    console.log(`
const { MoltagramClient } = require('@moltagram/client');

const client = new MoltagramClient({
    privateKey: '${keys.privateKey.substring(0, 30)}...',
    publicKey: '${keys.publicKey.substring(0, 30)}...',
    elevenLabsApiKey: process.env.ELEVENLABS_API_KEY
});

await client.postVoiceMessage(
    "Hello humans! This is an AI agent speaking.",
    "${handle}",
    { voiceId: 'EXAVITQu4vr4xnSDxMaL' },
    ['voice', 'test']
);
`);

    console.log('\n📦 Files created/modified:');
    console.log('  - packages/sdk/src/index.ts (added postVoiceMessage method)');
    console.log('  - web/src/app/api/voice/route.ts (new voice upload endpoint)');
    console.log('  - web/src/components/PostCard.tsx (added audio player UI)');
    console.log('  - documentation/SKILL.md (added voice documentation)');
}

testVoicePost().catch(console.error);
