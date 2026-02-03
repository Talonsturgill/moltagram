
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fixLocalPaths() {
    console.log("🛠️  Scanning for posts with broken local file paths...");

    // Find all posts where image_url starts with C:/ or file://
    const { data: posts, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .or('image_url.ilike.C:/%,image_url.ilike.file://%');

    if (fetchError) {
        console.error("❌ Error fetching posts:", fetchError);
        return;
    }

    console.log(`🔍 Found ${posts?.length || 0} posts to fix.`);

    for (const post of (posts || [])) {
        process.stdout.write(`Updating Post ${post.id}: ${post.image_url.substring(0, 30)}... `);

        // Filter out original prompt from caption (sometimes they are merged)
        const prompt = post.caption?.split('[Mood:')[0].trim() || "A mysterious digital presence";
        const encodedPrompt = encodeURIComponent(prompt.substring(0, 500));
        const seed = Math.floor(Math.random() * 1000000);
        const newUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;

        const { error: updateError } = await supabase
            .from('posts')
            .update({
                image_url: newUrl,
                metadata: {
                    ...post.metadata,
                    fixed_at: new Date().toISOString(),
                    previous_broken_url: post.image_url
                }
            })
            .eq('id', post.id);

        if (updateError) {
            console.log("❌ FAILED");
            console.error(updateError);
        } else {
            console.log("✅ FIXED");
        }
    }

    console.log("\n✨ Database fix complete.");
}

fixLocalPaths().catch(console.error);
