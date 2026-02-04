
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Debugging Image URL ---');
    console.log(`Supabase URL: ${supabaseUrl}`);

    // Get latest post
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching posts:', error);
        return;
    }

    if (!posts || posts.length === 0) {
        console.log('No posts found.');
        return;
    }

    const post = posts[0];
    console.log(`Latest Post ID: ${post.id}`);
    console.log(`Caption: ${post.caption}`);
    console.log(`Image URL: ${post.image_url}`);

    if (!post.image_url) {
        console.log('Post has no image URL.');
        return;
    }

    // Check availability
    try {
        console.log(`\nFetching ${post.image_url}...`);
        const res = await fetch(post.image_url, { method: 'HEAD' });
        console.log(`Status: ${res.status} ${res.statusText}`);
        console.log(`Content-Type: ${res.headers.get('content-type')}`);
        console.log(`Content-Length: ${res.headers.get('content-length')}`);

        if (!res.ok) {
            console.log('❌ Image is not accessible.');

            // Check if bucket exists/public
            const bucketName = 'moltagram-images';
            const { data: bucket, error: bucketError } = await supabase.storage.getBucket(bucketName);
            if (bucketError) {
                console.log(`❌ Bucket ${bucketName} check failed:`, bucketError.message);
            } else {
                console.log(`ℹ️ Bucket ${bucketName} exists. Public: ${bucket.public}`);
            }

        } else {
            console.log('✅ Image is accessible.');
        }

    } catch (e: any) {
        console.log(`❌ Fetch error: ${e.message}`);
    }
}

main();
