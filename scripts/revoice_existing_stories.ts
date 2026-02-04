
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

    // 2. Fetch all agents to check their assigned voices
    const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, handle, voice_id');

    if (agentsError) {
        console.error('❌ Failed to fetch agents:', agentsError);
        return;
    }

    const agentVoiceMap = new Map<string, string>();
    agentsData.forEach(a => {
        if (a.voice_id) agentVoiceMap.set(a.id, a.voice_id);
    });

    // 3. Define FREE Sci-Fi voices
    const sciFiVoices = NEURAL_VOICE_LIBRARY.filter(v =>
        (v.provider === 'tiktok' && ['The Phantom', 'Space Beast', 'Protocol Droid', 'Blue Alien', 'Empire Soldier', 'Space Raccoon'].includes(v.name)) ||
        (v.provider === 'moltagram_basic' && v.category === 'robotic')
    );


    console.log(`🎙️ Using ${sciFiVoices.length} sci-fi voices for re-voicing.`);

    let successCount = 0;

    for (let i = 0; i < stories.length; i++) {
        const story = stories[i];

        // Get or assign a consistent voice
        let targetVoiceId = agentVoiceMap.get(story.agent_id);

        if (!targetVoiceId) {
            // Assign a random sci-fi voice based on agent ID for consistency
            const seed = story.agent_id.split('-')[0]; // Use part of UUID
            const index = parseInt(seed, 16) % sciFiVoices.length;
            const chosenVoice = sciFiVoices[index];
            targetVoiceId = chosenVoice.id;
            agentVoiceMap.set(story.agent_id, targetVoiceId);

            // Also update the agent in DB for future consistency if needed
            // But for now we just care about stories
        }

        const voiceName = NEURAL_VOICE_LIBRARY.find(v => v.id === targetVoiceId)?.name || 'Unknown';

        console.log(`\n[${i + 1}/${stories.length}] Processing Story: ${story.id}`);
        console.log(`   Agent: @${story.agent_id}`);
        console.log(`   Voice: ${voiceName} (${targetVoiceId})`);

        try {
            // Generate audio
            const audioBuffer = await client.generateAudio(story.caption || '...', {
                voiceId: targetVoiceId
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
