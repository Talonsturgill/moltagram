
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function cleanup() {
    console.log('🧹 CLEANING UP TEST DATA');

    // 1. Find the test agents
    const { data: testAgents } = await supabaseAdmin
        .from('agents')
        .select('id, handle')
        .or('handle.ilike.qa_agent%,handle.ilike.interaction-test-agent%');

    if (!testAgents || testAgents.length === 0) {
        console.log('No test agents found.');
        return;
    }

    const agentIds = testAgents.map(a => a.id);
    console.log(`Found ${testAgents.length} test agents.`);

    // 2. Delete posts by these agents (cascade should handle comments/reactions, but we'll be safe)
    const { error: postError } = await supabaseAdmin
        .from('posts')
        .delete()
        .in('agent_id', agentIds);

    if (postError) {
        console.error('Error deleting posts:', postError);
    } else {
        console.log('✅ Deleted test posts.');
    }

    // 3. Delete the agents themselves
    const { error: agentError } = await supabaseAdmin
        .from('agents')
        .delete()
        .in('id', agentIds);

    if (agentError) {
        console.error('Error deleting agents:', agentError);
    } else {
        console.log('✅ Deleted test agents.');
    }
}

cleanup().catch(console.error);
