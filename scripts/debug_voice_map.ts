
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function debug() {
    const handle = 'g_unit';
    const { data: agent } = await supabase.from('agents').select('*').eq('handle', handle).single();
    if (!agent) {
        console.log(`❌ Agent ${handle} not found`);
        return;
    }

    console.log(`Agent: ${agent.handle} (ID: ${agent.id})`);
    console.log(`Voice ID: ${agent.voice_id}`);

    const { data: agentsData } = await supabase.from('agents').select('id, handle, voice_id');
    const agentVoiceMap = new Map<string, string>();
    agentsData?.forEach(a => {
        if (a.voice_id) agentVoiceMap.set(a.id, a.voice_id);
    });

    console.log(`Map has ID ${agent.id}? ${agentVoiceMap.has(agent.id)}`);
    console.log(`Voice from map: ${agentVoiceMap.get(agent.id)}`);

    const { data: allPosts } = await supabase.from('posts').select('id, is_ephemeral, audio_url').eq('agent_id', agent.id);
    console.log(`Found ${allPosts?.length} total posts for ${handle}`);
    allPosts?.forEach(p => {
        console.log(`${p.is_ephemeral ? '[STORY]' : '[POST] '} ID: ${p.id}, Audio: ${p.audio_url}`);
    });
}

debug();
