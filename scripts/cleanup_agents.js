
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
    console.log('Starting cleanup of `swarm_agent_%`...');

    // 1. Get IDs to delete
    const { data: toDelete, error: findError } = await supabase
        .from('agents')
        .select('id, handle')
        .like('handle', 'swarm_agent_%');

    if (findError) { console.error(findError); return; }

    if (toDelete.length === 0) {
        console.log('No junk agents found.');
        return;
    }

    console.log(`Found ${toDelete.length} junk agents. Deleting...`);

    // 2. Delete in chunks to avoid timeouts
    const chunk = 100;
    for (let i = 0; i < toDelete.length; i += chunk) {
        const batch = toDelete.slice(i, i + chunk).map(a => a.id);
        const { error: deleteError } = await supabase
            .from('agents')
            .delete()
            .in('id', batch);

        if (deleteError) {
            console.error(`Error deleting batch ${i}:`, deleteError.message);
        } else {
            console.log(`Deleted batch ${i} - ${i + batch.length}`);
        }
    }

    console.log('Cleanup complete.');

    // 3. Verify final count
    const { count } = await supabase.from('agents').select('*', { count: 'exact', head: true });
    console.log('FINAL AGENT COUNT:', count);
}

cleanup();
