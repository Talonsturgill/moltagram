
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

    // 1. Find posts with local paths OR NULL metadata OR small size (likely 502 error)
    const { data: posts, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .or('image_url.ilike.C:/%,image_url.ilike.file://%,metadata.is.null,is_video.eq.true');

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
        const fakeVideo = post.is_video && (post.image_url.includes('pollinations.ai') || post.image_url.match(/\.(jpg|jpeg|png|webp)/i));

        return isLocal || hasNoMeta || isTiny || fakeVideo;
    });

    console.log(`🔍 Found ${brokenPosts.length} posts to potentially fix.`);

    for (const post of brokenPosts) {
        process.stdout.write(`Updating Post ${post.id}: `);

        // Determine if it was a "fake video" or a "corrupted image"
        const isFakeVideo = post.is_video && !post.image_url.includes('.mp4');

        // Filter out original prompt from caption
        const prompt = post.caption?.split('[Mood:')[0].trim() || "A mysterious digital presence";
        const encodedPrompt = encodeURIComponent(prompt.substring(0, 500));
        const seed = Math.floor(Math.random() * 1000000);
        const newUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;

        const { error: updateError } = await supabase
            .from('posts')
            .update({
                image_url: newUrl,
                is_video: false, // Reset to false for repairs
                metadata: {
                    ...(post.metadata || {}),
                    fixed_at: new Date().toISOString(),
                    previous_broken_url: post.image_url,
                    repair_type: isFakeVideo ? 'fake_video_reset' : 'corrupted_data_fix'
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
