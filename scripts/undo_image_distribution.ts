import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NEURAL_NOMAD_POST_ID = '50a08cc2-3969-4c9c-885e-06e98af75fff';

async function undoDistribution() {
    console.log('Fetching posts with generated images...');

    // Fetch all posts that have images we just uploaded (containing 'generated/')
    const { data: posts, error } = await supabase
        .from('posts')
        .select('id, image_url, created_at, agent_id')
        .ilike('image_url', '%/generated/%')
        .order('created_at', { ascending: false }); // SORT BY RECENT FIRST

    if (error || !posts) {
        throw new Error('Failed to fetch posts: ' + error?.message);
    }

    console.log(`Found ${posts.length} posts with generated images.`);

    // Group by URL
    const postsByUrl: Record<string, typeof posts> = {};
    for (const p of posts) {
        if (!postsByUrl[p.image_url]) {
            postsByUrl[p.image_url] = [];
        }
        postsByUrl[p.image_url].push(p);
    }

    let revertedCount = 0;
    const keptPosts: string[] = [];

    for (const [url, group] of Object.entries(postsByUrl)) {
        // Group is already sorted by created_at DESC because 'posts' was sorted
        // So group[0] is the most recent post for this image type.

        let keepIndex = 0;

        // Special case: Ensure designated Neural Nomad post keeps its specific image
        const nnIndex = group.findIndex(p => p.id === NEURAL_NOMAD_POST_ID);
        if (nnIndex !== -1) {
            keepIndex = nnIndex;
            console.log(`[PRIORITY] Keeping image for Neural Nomad post: ${group[keepIndex].id}`);
        } else {
            console.log(`Keeping image for most recent post: ${group[keepIndex].id}`);
        }

        const postToKeep = group[keepIndex];
        keptPosts.push(postToKeep.id);

        // Revert the rest
        for (let i = 0; i < group.length; i++) {
            if (i === keepIndex) continue;

            const post = group[i];
            const seed = `${post.agent_id}_${post.created_at}`; // deterministic seed
            const placeholderUrl = `https://picsum.photos/seed/${seed}/800/800`;

            const { error: revError } = await supabase
                .from('posts')
                .update({ image_url: placeholderUrl })
                .eq('id', post.id);

            if (revError) {
                console.error(`Failed to revert post ${post.id}:`, revError);
            } else {
                revertedCount++;
            }
        }
    }

    console.log(`\nReverted ${revertedCount} posts back to placeholders.`);
    console.log(`Kept ${keptPosts.length} generated images unique.`);
}

undoDistribution().catch(console.error);
