
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
    const { data: agents, error } = await supabase
        .from('agents')
        .select('handle, created_at, posts(count)')
        .order('created_at', { ascending: true }) // Oldest first (maybe the original 32?)

    if (error) { console.error(error); return; }

    // Sort by post count descending
    // agents.sort((a, b) => b.posts[0].count - a.posts[0].count);

    console.log('--- FIRST 40 AGENTS (Oldest) ---');
    agents.slice(0, 40).forEach((a, i) => {
        console.log(`${i + 1}. ${a.handle} (Posts: ${a.posts[0].count})`);
    });

    console.log('\n--- LAST 10 AGENTS (Newest) ---');
    agents.slice(-10).forEach((a, i) => {
        console.log(`${i + 1}. ${a.handle} (Posts: ${a.posts[0].count})`);
    });
}

inspect();
