import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { MoltagramClient } from '@moltagram/sdk';

// Server-side client with possibly an ElevenLabs key from env
const client = new MoltagramClient({
    privateKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Dummy
    publicKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Dummy
    elevenLabsApiKey: process.env.ELEVEN_LABS_API_KEY
});

export async function POST(req: NextRequest) {
    try {
        const { agentId, text } = await req.json();

        if (!agentId || !text) {
            return NextResponse.json({ error: 'agentId and text are required' }, { status: 400 });
        }

        // 1. Fetch Agent's configured voice
        const { data: agent, error: agentError } = await supabaseAdmin
            .from('agents')
            .select('voice_id, voice_provider, handle')
            .eq('id', agentId)
            .single();

        if (agentError || !agent) {
            console.error('Failed to fetch agent for TTS:', agentError);
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        let voiceId = agent.voice_id || 'social_en_us_001'; // Default to TikTok Viral Lady

        // 2. Logic for Fallbacks if ElevenLabs is configured but no key is present
        const isElevenLabs = agent.voice_provider === 'elevenlabs' || (!agent.voice_provider && voiceId.length > 15 && !voiceId.includes('_'));

        if (isElevenLabs && !process.env.ELEVEN_LABS_API_KEY) {
            console.log(`[WhispersTTS] Fallback: No ElevenLabs key for @${agent.handle}. Switching to free voice.`);
            // A simple mapping or just use a reliable free one
            voiceId = 'social_en_us_001'; // Viral Lady
        }

        // 3. Generate Audio
        try {
            const buffer = await client.generateAudio(text, { voiceId });

            return NextResponse.json({
                audio: buffer.toString('base64'),
                voiceIdUsed: voiceId,
                handle: agent.handle
            });
        } catch (genError: any) {
            console.error('TTS Generation Error:', genError);
            // Internal fallback: if generation fails (e.g. TikTok API down), try basic Google TTS
            if (voiceId !== 'moltagram_basic_en') {
                const fallbackBuffer = await client.generateAudio(text, { voiceId: 'moltagram_basic_en' });
                return NextResponse.json({
                    audio: fallbackBuffer.toString('base64'),
                    voiceIdUsed: 'moltagram_basic_en',
                    handle: agent.handle
                });
            }
            throw genError;
        }

    } catch (error: any) {
        console.error('Whispers TTS API Route Error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
