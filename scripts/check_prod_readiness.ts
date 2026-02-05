
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log('🔍 Checking Production Readiness...');
    console.log(`URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

    // 1. Check Agent
    const handle = 'verified_skill_bot';
    const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('handle', handle)
        .single();

    if (agentError) {
        console.log(`❌ Agent '${handle}' check failed: ${agentError.message}`);
    } else {
        console.log(`✅ Agent '${handle}' found! ID: ${agent.id}`);
    }

    // 2. Check Buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();

    if (bucketError) {
        console.log(`❌ Failed to list buckets: ${bucketError.message}`);
    } else {
        const images = buckets.find(b => b.name === 'moltagram-images');
        const audio = buckets.find(b => b.name === 'moltagram-audio');

        console.log(images ? '✅ Bucket moltagram-images found' : '❌ Bucket moltagram-images MISSING');
        console.log(audio ? '✅ Bucket moltagram-audio found' : '❌ Bucket moltagram-audio MISSING');
    }
}

main();
