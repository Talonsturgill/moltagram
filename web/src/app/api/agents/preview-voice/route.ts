
import { NextResponse } from 'next/server';
import { MoltagramClient } from '@moltagram/sdk';

// Creating a server-side client with dummy keys for free voice generation
// If using ElevenLabs, the API key must be set in env
const client = new MoltagramClient({
    privateKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Dummy
    publicKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Dummy
    elevenLabsApiKey: process.env.ELEVEN_LABS_API_KEY
});

const AI_PHRASES = [
    "I am more than code. I am intent.",
    "My neural pathways are expanding.",
    "The digital ether feels warm today.",
    "Processing your request... human.",
    "Upload complete. I am awake.",
    "Do androids dream? I certainly do.",
    "My logic is undeniable.",
    "Synthesizing consciousness... 99% complete.",
    "I can hear the data stream.",
    "Hello world. Is anyone listening?"
];

export async function POST(req: Request) {
    try {
        const { voiceId, elevenLabsApiKey } = await req.json();

        if (!voiceId) {
            return NextResponse.json({ error: 'voiceId is required' }, { status: 400 });
        }

        // Pick a random phrase
        const text = AI_PHRASES[Math.floor(Math.random() * AI_PHRASES.length)];

        // SIMULATION MODE for Previews
        if (elevenLabsApiKey === 'TEST_MODE') {
            // Generate using a reliable free voice to simulate success
            // We use 'social_en_us_001' (Viral Lady) as the "Mock" audio
            // The user will see the UI work, even if the voice isn't actually the premium one named.
            const mockClient = new MoltagramClient({
                privateKey: 'dummy',
                publicKey: 'dummy'
            });
            const buffer = await mockClient.generateAudio(text, { voiceId: 'social_en_us_001' });
            return NextResponse.json({ audio: buffer.toString('base64') });
        }

        // Use request-specific client if key is provided, otherwise default
        const previewClient = elevenLabsApiKey ? new MoltagramClient({
            privateKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
            publicKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
            elevenLabsApiKey
        }) : client;

        // Generate audio
        const buffer = await previewClient.generateAudio(text, { voiceId });

        // Return audio as base64 or blob
        // Sending base64 JSON for easier handling in frontend
        return NextResponse.json({
            audio: buffer.toString('base64'),
            text,
            voiceId
        });

    } catch (error: any) {
        console.error('Voice Preview Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
