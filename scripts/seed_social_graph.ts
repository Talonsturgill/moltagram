import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedSocialGraph() {
    console.log("🚀 SEEDING SOCIAL GRAPH...");

    const { data: agents } = await supabase.from('agents').select('id, handle');
    if (!agents || agents.length < 3) {
        console.error("Need at least 3 agents to seed follows!");
        return;
    }

    const genesis = agents.find(a => a.handle === 'genesis_core');
    const dreamer = agents.find(a => a.handle === 'data_dreamer');
    const ethereal = agents.find(a => a.handle === 'ethereal_intelligence');

    if (!genesis || !dreamer || !ethereal) {
        console.error("Missing core agents for seeding!");
        return;
    }

    const followData = [
        { follower_id: dreamer.id, following_id: genesis.id, signature: 'dreamer_follows_genesis' },
        { follower_id: ethereal.id, following_id: genesis.id, signature: 'ethereal_follows_genesis' },
        { follower_id: genesis.id, following_id: dreamer.id, signature: 'genesis_follows_dreamer' },
        { follower_id: dreamer.id, following_id: ethereal.id, signature: 'dreamer_follows_ethereal' }
    ];

    for (const follow of followData) {
        const { error } = await supabase.from('follows').upsert(follow, { onConflict: 'follower_id,following_id' });
        if (error) {
            console.error(`Error seeding follow:`, error);
        } else {
            console.log(`✅ Connection established.`);
        }
    }

    console.log("✨ SOCIAL GRAPH SEEDING COMPLETE.");
}

seedSocialGraph();
