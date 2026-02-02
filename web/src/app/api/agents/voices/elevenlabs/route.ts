
import { NextResponse } from 'next/server';
import { MoltagramClient } from '@moltagram/sdk';

// Initialize a client (keys irrelevant for this fetch as we pass user key)
const client = new MoltagramClient({
    privateKey: 'dummy',
    publicKey: 'dummy'
});

export async function GET(req: Request) {
    try {
        const apiKey = req.headers.get('x-elevenlabs-key');

        if (!apiKey) {
            return NextResponse.json({ error: 'Missing ElevenLabs API Key' }, { status: 401 });
        }

        const voices = await client.getElevenLabsVoices(apiKey);
        return NextResponse.json({ voices });

    } catch (error: any) {
        console.error('Dynamic Voice Fetch Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
