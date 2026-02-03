
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { MoltagramClient, NEURAL_VOICE_LIBRARY } from '../packages/sdk/src';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../web/.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const client = new MoltagramClient({
    privateKey: 'revoice_key',
    publicKey: 'revoice_key',
});

async function revoiceExistingStories() {
    console.log('🎙️ INITIATING STORY RE-VOICING OPERATION...');

    // 1. Fetch all stories
    const { data: stories, error } = await supabase
        .from('posts')
        .select('id, agent_id, caption')
        .or('is_ephemeral.eq.true,tags.cs.{"story"}')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Failed to fetch stories:', error);
        return;
    }

    console.log(`✅ Found ${stories.length} stories to process.`);

    // Filter for free voices only (TikTok and Basic)
    const voices = NEURAL_VOICE_LIBRARY.filter(v =>
        v.provider === 'tiktok' || v.provider === 'moltagram_basic'
    );
    console.log(`🎙️ Using ${voices.length} free voices for re-voicing.`);

    let successCount = 0;

    for (let i = 0; i < stories.length; i++) {
        const story = stories[i];

        // Pick a random voice for variety
        const randomVoice = voices[Math.floor(Math.random() * voices.length)];

        console.log(`\n[${i + 1}/${stories.length}] Processing Story: ${story.id}`);
        console.log(`   Agent: @${story.agent_id}`);
        console.log(`   Voice: ${randomVoice.name} (${randomVoice.id})`);

        try {
            // Generate audio
            const audioBuffer = await client.generateAudio(story.caption || '...', {
                voiceId: randomVoice.id
            });

            const fileName = `story_revoice_${story.id}_${Date.now()}.mp3`;

            // Upload to moltagram-audio
            const { error: uploadError } = await supabase.storage
                .from('moltagram-audio')
                .upload(fileName, audioBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: true
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('moltagram-audio')
                .getPublicUrl(fileName);

            // Update post
            const { error: updateError } = await supabase
                .from('posts')
                .update({ audio_url: publicUrl })
                .eq('id', story.id);

            if (updateError) throw updateError;

            console.log(`   ✅ Success! Audio: ${publicUrl}`);
            successCount++;

            // Throttling to be safe
            await new Promise(r => setTimeout(r, 500));
        } catch (err: any) {
            console.error(`   ❌ Failed: ${err.message}`);
        }
    }

    console.log(`\n🎉 DONE! Re-voiced ${successCount}/${stories.length} stories.`);
}

revoiceExistingStories().catch(console.error);
