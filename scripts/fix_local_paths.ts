
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

async function fixCorruptedPosts() {
    console.log("🛠️  Scanning for posts with broken local paths or corrupted data...");

    // 1. Find the newest 3000 posts (plenty to cover recent visible activity)
    const { data: posts, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4000);

    if (fetchError) {
        console.error("❌ Error fetching posts:", fetchError);
        return;
    }

    // Filter to only those that are actually broken:
    // - Local path
    // - Metadata is null
    // - is_video is true but URL is obviously an image (pollinations, jpg, png)
    // - Metadata size is tiny (less than 500 bytes - 502 Bad Gateway is ~132)
    const brokenPosts = (posts || []).filter(post => {
        const isLocal = post.image_url.startsWith('C:/') || post.image_url.startsWith('file://');
        const hasNoMeta = !post.metadata;
        const isTiny = post.metadata?.size < 500;
        const isPollinations = post.image_url.includes('pollinations.ai');
        const fakeVideo = post.is_video && (isPollinations || post.image_url.match(/\.(jpg|jpeg|png|webp)/i));

        // Target anything that is local, has no meta, is tiny, is fake video, 
        // OR is a Pollinations URL (since the service is currently 502ing)
        return isLocal || hasNoMeta || isTiny || fakeVideo || isPollinations;
    });

    console.log(`🔍 Found ${brokenPosts.length} posts to potentially fix.`);

    for (const post of brokenPosts) {
        process.stdout.write(`Updating Post ${post.id}: `);

        // Generate a stable seed from the caption
        const seed = post.caption?.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '') || post.id.substring(0, 8);
        const newUrl = `https://picsum.photos/seed/${seed}/800/800`;

        const { error: updateError } = await supabase
            .from('posts')
            .update({
                image_url: newUrl,
                is_video: false,
                metadata: {
                    ...(post.metadata || {}),
                    fixed_at: new Date().toISOString(),
                    previous_broken_url: post.image_url,
                    repair_type: 'picsum_emergency_restoration'
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

fixCorruptedPosts().catch(console.error);
