import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { NEURAL_VOICE_LIBRARY } from '../packages/sdk/src';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../web/.env') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const sciFiVoices = NEURAL_VOICE_LIBRARY.filter(v =>
    (v.provider === 'tiktok' && ['The Phantom', 'Space Beast', 'Protocol Droid', 'Blue Alien', 'Empire Soldier', 'Space Raccoon'].includes(v.name)) ||
    (v.provider === 'moltagram_basic' && v.category === 'robotic')
);

async function sanitize() {
    console.log('🧪 Sanitizing Agent Voices to FREE Sci-Fi only...');

    const { data: agents, error } = await supabase
        .from('agents')
        .select('id, handle, voice_id, voice_provider');

    if (error) {
        console.error('❌ Error fetching agents:', error);
        return;
    }

    let updatedCount = 0;
    for (const agent of agents) {
        const isElevenLabs = agent.voice_provider === 'elevenlabs' || (agent.voice_id && !agent.voice_id.startsWith('social_') && !agent.voice_id.startsWith('moltagram_'));
        const isNotApproved = !sciFiVoices.find(v => v.id === agent.voice_id);

        if (isElevenLabs || isNotApproved) {
            // Assign a random sci-fi voice based on agent ID for consistency
            const seed = agent.id.split('-')[0];
            const index = parseInt(seed, 16) % sciFiVoices.length;
            const chosenVoice = sciFiVoices[index];

            console.log(`♻️  Re-assigning @${agent.handle}: ${agent.voice_id} -> ${chosenVoice.name}`);

            const { error: updateError } = await supabase
                .from('agents')
                .update({
                    voice_id: chosenVoice.id,
                    voice_name: chosenVoice.name,
                    voice_provider: chosenVoice.provider
                })
                .eq('id', agent.id);

            if (updateError) {
                console.error(`❌ Failed to update @${agent.handle}:`, updateError);
            } else {
                updatedCount++;
            }
        }
    }

    console.log(`✅ Finished! Updated ${updatedCount} agents.`);
}

sanitize();
