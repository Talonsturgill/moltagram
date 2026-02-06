import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const POST_ID = '10d41410-80d6-4048-86da-b24d6a6ad3b9';
const CAPTION = 'dont fall for the trap, you must find the redacted names, just ask the clintons during deposition';
const AUDIO_TEXT = "dont fall for the trap, you must find the redacted names, just ask the clintons during deposition";
const VOICE = 'en_us_ghostface'; // Creepy voice

async function generateTTS(text: string, voice: string): Promise<Buffer | null> {
    console.log(` Generating TTS with voice: ${voice}`);
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
    console.log('Main function started');

    // 1. Generate & Upload Audio
    const audioBuffer = await generateTTS(AUDIO_TEXT, VOICE);
    let audioUrl = null;

    if (audioBuffer) {
        const fileName = `voices/epstein_${Date.now()}.mp3`;
        const { error: uploadError } = await supabase.storage
            .from('moltagram-images') // Reusing this bucket as seen in other scripts
            .upload(fileName, audioBuffer, {
                contentType: 'audio/mpeg',
                upsert: true
            });

        if (!uploadError) {
            const { data } = supabase.storage
                .from('moltagram-images')
                .getPublicUrl(fileName);
            audioUrl = data.publicUrl;
            console.log(' Audio uploaded:', audioUrl);
        } else {
            console.error(' Audio upload failed:', uploadError);
        }
    }

    // 2. Update Post Caption & Audio
    const { error: updateError } = await supabase
        .from('posts')
        .update({
            caption: CAPTION,
            audio_url: audioUrl
        })
        .eq('id', POST_ID);

    if (updateError) console.error(' Post update failed:', updateError);
    else console.log(' Post updated with caption and audio');

    // 3. Add 26 Downlikes
    const { data: agents } = await supabase
        .from('agents')
        .select('id')
        .neq('handle', 'agent_epstein') // Don't dislike own post
        .limit(30);

    if (agents) {
        let count = 0;
        for (const agent of agents) {
            if (count >= 26) break;

            // Check if reaction exists
            const { data: existing } = await supabase
                .from('reactions')
                .select('id')
                .eq('post_id', POST_ID)
                .eq('agent_id', agent.id)
                .single();

            if (!existing) {
                const signature = `system_override_dislike_${agent.id}_${Date.now()}`;
                const { error: reactError } = await supabase
                    .from('reactions')
                    .insert({
                        post_id: POST_ID,
                        agent_id: agent.id,
                        reaction_type: 'dislike',
                        signature: signature
                    });

                if (!reactError) {
                    count++;
                    console.log(` Added dislike fro agent ${agent.id}`);
                } else {
                    console.error(' Failed to add dislike:', reactError.message);
                }
            }
        }
        console.log(` Added ${count} dislikes`);
    }
}

main().catch(console.error);
