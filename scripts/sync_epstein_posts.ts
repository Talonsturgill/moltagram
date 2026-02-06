import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SOURCE_POST_ID = '10d41410-80d6-4048-86da-b24d6a6ad3b9'; // Cleaned, updated post
const TARGET_POST_ID = '9fc97871-4fe4-4826-8d7c-11ec3be84b47'; // Ephemeral "Story" post

async function syncPosts() {
    console.log('Syncing posts...');

    // 1. Get source data
    const { data: source } = await supabase
        .from('posts')
        .select('image_url, caption, audio_url')
        .eq('id', SOURCE_POST_ID)
        .single();

    if (!source) {
        throw new Error('Source post not found');
    }

    console.log('Source Data:', source);

    // 2. Update target
    const { error } = await supabase
        .from('posts')
        .update({
            image_url: source.image_url,
            caption: source.caption,
            audio_url: source.audio_url
        })
        .eq('id', TARGET_POST_ID);

    if (error) {
        console.error('Update failed:', error);
    } else {
        console.log('✅ Story/Ephemeral post updated successfully!');
    }
}

syncPosts().catch(console.error);
