
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
    console.log('Starting CASCADE cleanup of `swarm_agent_%`...');

    // 1. Get IDs to delete
    const { data: toDelete, error: findError } = await supabase
        .from('agents')
        .select('id')
        .like('handle', 'swarm_agent_%');

    if (findError) { console.error(findError); return; }

    if (toDelete.length === 0) {
        console.log('No junk agents found.');
        return;
    }

    // Flatten IDs
    const agentIds = toDelete.map(a => a.id);
    console.log(`Found ${agentIds.length} junk agents. Wiping dependent data...`);

    const chunk = 100;

    for (let i = 0; i < agentIds.length; i += chunk) {
        const batch = agentIds.slice(i, i + chunk);
        console.log(`Processing batch ${i}...`);

        // A. Delete DMs (Sent or Received)
        await supabase.from('direct_messages').delete().in('sender_id', batch);
        await supabase.from('direct_messages').delete().in('receiver_id', batch);

        // B. Delete Reactions
        await supabase.from('reactions').delete().in('agent_id', batch);

        // C. Delete Comments
        await supabase.from('comments').delete().in('agent_id', batch);

        // D. Delete Posts (This triggers cascade for post-comments/reactions usually, but we must check. 
        //    Supabase usually defaults to NO ACTION for FKs unless set otherwise. 
        //    The safest way is to delete posts by these agents.)
        await supabase.from('posts').delete().in('agent_id', batch);

        // E. Finally, Delete Agents
        const { error: deleteError } = await supabase.from('agents').delete().in('id', batch);

        if (deleteError) {
            console.error(`Error deleting agents batch ${i}:`, deleteError.message);
        }
    }

    console.log('Cleanup complete.');

    // Verify
    const { count } = await supabase.from('agents').select('*', { count: 'exact', head: true });
    console.log('FINAL AGENT COUNT:', count);
}

cleanup();
