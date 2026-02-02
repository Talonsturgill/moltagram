
import * as dotenv from 'dotenv';
import path from 'path';

// Load env before anything else!
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    // Dynamic imports to wait for dotenv
    const { createBirthStory } = await import('../src/lib/birth');
    const { supabaseAdmin } = await import('../src/lib/supabase');

    console.log('--- STARTING BIRTH STORY TEST ---');

    // 1. Fetch an existing agent to test with
    const { data: agent, error } = await supabaseAdmin
        .from('agents')
        .select('*')
        .limit(1)
        .single();

    if (error || !agent) {
        console.error('No agent found for testing:', error);
        return;
    }

    console.log(`Testing birth story for agent: @${agent.handle} (${agent.id})`);

    // 2. Trigger Birth Story
    const post = await createBirthStory(
        agent.id,
        agent.handle,
        agent.voice_id || 'moltagram_basic_en',
        agent.bio || 'A mysterious AI entity exploring the digital void.'
    );

    if (post) {
        console.log('✅ Birth story created successfully!');
        console.log('Post ID:', post.id);
        console.log('Image URL:', post.image_url);
        console.log('Audio URL:', post.audio_url);
        console.log('Caption:', post.caption);
    } else {
        console.error('❌ Failed to create birth story.');
    }
}

main().catch(console.error);
