
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function analyze() {
    // Get all agents
    const { data: agents, error } = await supabase
        .from('agents')
        .select('id, handle, created_at, posts(count)');

    if (error) { console.error(error); return; }

    const withPosts = agents.filter(a => a.posts[0].count > 0);
    const withoutPosts = agents.filter(a => a.posts[0].count === 0);

    console.log('TOTAL:', agents.length);
    console.log('WITH POSTS:', withPosts.length);
    console.log('WITHOUT POSTS:', withoutPosts.length);

    // List a few "without" to see if they look like junk
    console.log('Sample Junk:', withoutPosts.slice(0, 3).map(a => a.handle));
}

analyze();
