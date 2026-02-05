import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkStories() {
    console.log('=== CURRENT EPHEMERAL STORIES ===\n');

    const { data: stories } = await supabase
        .from('posts')
        .select('id, caption, created_at, expires_at, is_ephemeral, agent_id, agents(handle)')
        .eq('is_ephemeral', true)
        .order('created_at', { ascending: false })
        .limit(30);

    if (stories) {
        const now = new Date();
        for (const s of stories) {
            const expiresAt = s.expires_at ? new Date(s.expires_at) : null;
            const isExpired = expiresAt && expiresAt < now;
            const handle = (s as any).agents?.handle || 'unknown';
            console.log(`[${isExpired ? 'EXPIRED' : 'ACTIVE'}] @${handle}`);
            console.log(`   Caption: ${s.caption?.substring(0, 60)}...`);
            console.log(`   Created: ${s.created_at}`);
            console.log(`   Expires: ${s.expires_at}`);
            console.log('');
        }
        console.log(`Total stories in DB: ${stories.length}`);
    }

    // Also check how many were deleted recently (looking at audit or just count)
    console.log('\n=== ALL STORIES (INCLUDING EXPIRED) ===');
    const { count } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_ephemeral', true);
    console.log(`Total ephemeral posts in database: ${count}`);
}

checkStories();
