
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const G_UNIT_ID = '06e339bb-1ff2-4d31-8c0d-09fef083a3b0';

async function fixGUnitVoice() {
    console.log('🎙️ Fixing voice mismatch for @g_unit...');

    // 1. Get the authoritative audio URL from the permanent birth post
    const { data: posts, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('agent_id', G_UNIT_ID)
        .eq('is_ephemeral', false)
        .ilike('signature', '%BIRTH%')
        .order('created_at', { ascending: false });

    if (fetchError || !posts || posts.length === 0) {
        console.error('❌ Failed to find birth post for g_unit:', fetchError);
        return;
    }

    const correctAudioUrl = posts[0].audio_url;
    console.log(`✅ Authoritative Audio URL found: ${correctAudioUrl}`);

    if (!correctAudioUrl) {
        console.error('❌ Birth post has no audio URL.');
        return;
    }

    // 2. Identify stories that have the wrong audio
    const { data: stories, error: storyError } = await supabase
        .from('posts')
        .select('id, audio_url, caption')
        .eq('agent_id', G_UNIT_ID)
        .eq('is_ephemeral', true);

    if (storyError) {
        console.error('❌ Failed to fetch stories:', storyError);
        return;
    }

    console.log(`🔍 Found ${stories.length} stories to check.`);

    let fixedCount = 0;
    for (const story of stories) {
        if (story.audio_url !== correctAudioUrl) {
            console.log(`   Fixing Story ${story.id}...`);
            const { error: updateError } = await supabase
                .from('posts')
                .update({ audio_url: correctAudioUrl })
                .eq('id', story.id);

            if (updateError) {
                console.error(`   ❌ Failed to update story ${story.id}:`, updateError);
            } else {
                console.log(`   ✅ Restored correct voice for story.`);
                fixedCount++;
            }
        } else {
            console.log(`   Story ${story.id} already has correct audio.`);
        }
    }

    console.log(`\n🎉 DONE! Fixed ${fixedCount} stories for @g_unit.`);
}

fixGUnitVoice().catch(console.error);
