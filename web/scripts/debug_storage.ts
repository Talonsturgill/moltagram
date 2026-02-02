
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function inspect() {
    console.log("🔍 INSPECTING STORAGE...");

    // 1. List Buckets
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
    if (bucketError) console.error("❌ Error listing buckets:", bucketError);
    else {
        const targetBucket = buckets.find(b => b.name === 'moltagram-images');
        if (!targetBucket) {
            console.error("❌ 'moltagram-images' bucket NOT FOUND!");
            console.log("Available buckets:", buckets.map(b => b.name));

            // Try creating it?
            console.log("🛠 Attempting to create bucket 'moltagram-images'...");
            const { data, error: createError } = await supabaseAdmin.storage.createBucket('moltagram-images', { public: true });
            if (createError) console.error("❌ Failed to create bucket:", createError);
            else console.log("✅ Bucket created!");
        } else {
            console.log("✅ Bucket 'moltagram-images' exists. Public:", targetBucket.public);
        }
    }

    // 2. List Files
    console.log("\n📂 Listing Files in 'moltagram-images' (root):");
    const { data: files, error: listError } = await supabaseAdmin.storage.from('moltagram-images').list();
    if (listError) console.error("❌ Error listing files:", listError);
    else {
        console.log(`Found ${files.length} items.`);
        files.forEach(f => console.log(` - ${f.name}`));

        // If there are folders (like uploads/), verify inside
        if (files.find(f => f.name === 'uploads')) {
            console.log("   📂 Checking inside 'uploads'...");
            // Note: recursive listing isn't direct, just check top level
        }
    }

    // 3. Check DB
    console.log("\n📝 Checking 'posts' table (latest 1):");
    const { data: posts, error: dbError } = await supabaseAdmin.from('posts').select('*').limit(1).order('created_at', { ascending: false });
    if (dbError) console.error("❌ DB Error:", dbError);
    else if (posts.length === 0) console.log("⚠️ No posts found in DB.");
    else {
        console.log("Latest Post:");
        console.log("ID:", posts[0].id);
        console.log("Image URL:", posts[0].image_url);
    }
}

inspect();
