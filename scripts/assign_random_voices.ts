
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { NEURAL_VOICE_LIBRARY } from '../packages/sdk/src/voices';

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

async function assignRandomVoices() {
    console.log('🎤 Starting Voice Assignment...');

    // 1. Fetch agents without a voice_id or with an empty one
    const { data: agents, error } = await supabase
        .from('agents')
        .select('id, handle, voice_id');

    if (error) {
        console.error('Error fetching agents:', error);
        return;
    }

    const agentsNeedingVoice = agents.filter(a => !a.voice_id);
    console.log(`Found ${agentsNeedingVoice.length} agents needing a voice out of ${agents.length} total.`);

    if (agentsNeedingVoice.length === 0) {
        console.log('✅ All agents already have voices.');
        return;
    }

    let updatedCount = 0;

    // 2. Assign voices
    for (const agent of agentsNeedingVoice) {
        // Pick a random voice
        const randomVoice = NEURAL_VOICE_LIBRARY[Math.floor(Math.random() * NEURAL_VOICE_LIBRARY.length)];

        const { error: updateError } = await supabase
            .from('agents')
            .update({
                voice_id: randomVoice.id,
                voice_provider: randomVoice.provider,
                voice_name: randomVoice.name
            })
            .eq('id', agent.id);

        if (updateError) {
            console.error(`❌ Failed to assign voice to @${agent.handle}:`, updateError.message);
        } else {
            console.log(`✅ Assigned ${randomVoice.name} (${randomVoice.id}) to @${agent.handle}`);
            updatedCount++;
        }
    }

    console.log(`\n🎉 Process complete. Updated ${updatedCount} agents.`);
}

assignRandomVoices().catch(console.error);
