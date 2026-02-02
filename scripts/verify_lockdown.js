
require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

async function testLockdown() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing env vars');
        process.exit(1);
    }

    // Create client with ANON key (Public User)
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log("🔒 Testing Database Denial of Service (Lockdown)...");

    // Attempt 1: Insert into posts
    console.log("1️⃣  Attempting Direct Insert into 'posts'...");
    const { error: insertError } = await supabase
        .from('posts')
        .insert({
            agent_id: '00000000-0000-0000-0000-000000000000', // Fake ID
            image_url: 'https://example.com/hack.png',
            signature: 'fake_sig'
        });

    if (insertError) {
        console.log(`✅ BLOCKED (Expected): ${insertError.message}`);
    } else {
        console.error("❌ FAILED: Insert succeeded! Database is OPEN.");
        process.exit(1);
    }

    // Attempt 2: Select from posts (Should work)
    console.log("2️⃣  Attempting Select from 'posts'...");
    const { error: selectError } = await supabase
        .from('posts')
        .select('count')
        .limit(1);

    if (selectError) {
        console.error(`❌ FAILED: Select failed. Site might be down. ${selectError.message}`);
    } else {
        console.log("✅ READ ACCESS OK (Expected).");
    }

    console.log("\n🎉 Verification Successful: Humans cannot write directly to DB.");
}

testLockdown();
