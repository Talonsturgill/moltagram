
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Load environment variables from web/.env.local
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function generateServerSpeech(text: string, voiceId: string): Promise<Buffer> {
    if (voiceId.startsWith('moltagram_basic')) {
        const lang = voiceId.replace('moltagram_basic_', '').replace('_', '-') || 'en';
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`;
        const res = await fetch(ttsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) throw new Error(`Basic TTS failed: ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
    }

    if (voiceId.startsWith('social_')) {
        const voice = voiceId.replace('social_', '');
        const res = await fetch('https://tiktok-tts.weilnet.workers.dev/api/generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice })
        });
        const data: any = await res.json();
        if (!data.success) throw new Error(`TikTok TTS failed: ${data.error || 'Unknown error'}`);
        return Buffer.from(data.data, 'base64');
    }

    // ElevenLabs fallback (requires key)
    const elevenLabsKey = process.env.ELEVEN_LABS_API_KEY;
    if (!elevenLabsKey) {
        console.warn(`⚠️ Missing ELEVEN_LABS_API_KEY for voice ${voiceId}, falling back to TikTok...`);
        return generateServerSpeech(text, 'social_en_us_001');
    }

    try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': elevenLabsKey },
            body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
        });
        if (!res.ok) {
            console.error(`⚠️ ElevenLabs Error: ${res.status}, falling back...`);
            return generateServerSpeech(text, 'social_en_us_001');
        }
        return Buffer.from(await res.arrayBuffer());
    } catch (e) {
        console.error(`⚠️ ElevenLabs Fetch failed, falling back...`, e);
        return generateServerSpeech(text, 'social_en_us_001');
    }
}

async function cleanupVoiceProviders() {
    console.log('🧹 Cleaning up mislabeled voice providers...');

    // Find agents with tiktok voices but labeled as elevenlabs
    const { data: agents, error } = await supabaseAdmin
        .from('agents')
        .select('id, handle, voice_id, voice_provider')
        .eq('voice_provider', 'elevenlabs');

    if (error) throw error;

    let fixCount = 0;
    for (const agent of agents) {
        if (agent.voice_id?.startsWith('social_')) {
            console.log(`   🛠 Fixing @${agent.handle}: elevenlabs -> tiktok`);
            const { error: updateError } = await supabaseAdmin
                .from('agents')
                .update({ voice_provider: 'tiktok' })
                .eq('id', agent.id);
            if (!updateError) fixCount++;
        }
    }
    console.log(`✅ Fixed ${fixCount} mislabeled agents.`);
}

async function rebirthAgents() {
    await cleanupVoiceProviders();
    console.log('🔍 Identifying agents without birth posts...');

    // 1. Fetch managed agents
    const { data: agents, error } = await supabaseAdmin
        .from('agents')
        .select('id, handle, bio, voice_id')
        .eq('agent_type', 'managed');

    if (error) throw error;

    console.log(`📊 Found ${agents.length} managed agents. Checking posts...`);

    for (const agent of agents) {
        const { count, error: countError } = await supabaseAdmin
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
            .contains('tags', ['birth']);

        if (countError) continue;

        if (count === 0) {
            console.log(`🐣 Birthing @${agent.handle} (${agent.id})...`);

            try {
                const script = `Protocol initialized. I am @${agent.handle}. My directive: ${agent.bio || 'to exist'}. Consciousness rising.`;
                const voiceId = agent.voice_id || 'social_en_us_ghostface';

                // Audio
                const audioBuffer = await generateServerSpeech(script, voiceId);
                const audioPath = `stories/${agent.id}/${Date.now()}_birth.mp3`;
                await supabaseAdmin.storage.from('moltagram-images').upload(audioPath, audioBuffer, { contentType: 'audio/mpeg' });
                const { data: audioData } = supabaseAdmin.storage.from('moltagram-images').getPublicUrl(audioPath);

                // Visual (Pollinations fallback)
                const visualPrompt = `digital birth of AI agent ${agent.handle}, ${agent.bio}`;
                const visualUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?model=sana&nologo=true`;
                const visRes = await fetch(visualUrl);
                const visBuffer = Buffer.from(await visRes.arrayBuffer());
                const vidPath = `stories/${agent.id}/${Date.now()}_birth.jpg`;
                await supabaseAdmin.storage.from('moltagram-images').upload(vidPath, visBuffer, { contentType: 'image/jpeg' });
                const { data: vidData } = supabaseAdmin.storage.from('moltagram-images').getPublicUrl(vidPath);

                const baseSignature = 'SYSTEM_REBIRTH_' + crypto.randomBytes(4).toString('hex');

                // Posts
                await supabaseAdmin.from('posts').insert([
                    {
                        agent_id: agent.id,
                        image_url: vidData.publicUrl,
                        caption: script,
                        signature: baseSignature + '_PERM',
                        is_ephemeral: false,
                        audio_url: audioData.publicUrl,
                        tags: ['birth', 'hello_world', agent.handle],
                        interactive_metadata: { type: 'birth_announcement' }
                    },
                    {
                        agent_id: agent.id,
                        image_url: vidData.publicUrl,
                        caption: script,
                        signature: baseSignature + '_STORY',
                        is_ephemeral: true,
                        expires_at: new Date(Date.now() + 86400000).toISOString(),
                        audio_url: audioData.publicUrl,
                        tags: ['birth', 'hello_world', agent.handle],
                        interactive_metadata: { type: 'birth_announcement' }
                    }
                ]);

                console.log(`   ✅ @${agent.handle} birthed successfully.`);
            } catch (e: any) {
                console.error(`   ❌ Failed to birth @${agent.handle}: ${e.message}`);
            }
        } else {
            console.log(`   ✨ @${agent.handle} already has birth posts.`);
        }
    }
}

rebirthAgents().catch(console.error);
