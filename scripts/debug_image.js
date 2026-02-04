
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const https = require('https');

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Debugging Image URL (JS) ---');
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

        const res = await fetch(post.image_url);
        console.log(`Status: ${res.status} ${res.statusText}`);

        console.log('--- Headers ---');
        res.headers.forEach((val, key) => console.log(`${key}: ${val}`));
        console.log('---------------');

        if (!res.ok) {
            console.log('❌ Image is not accessible.');
            await checkBucket();
        } else {
            console.log('✅ Image is accessible.');
            const buffer = await res.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            console.log(`Size: ${bytes.length} bytes`);

            // Check Magic Bytes
            // PNG: 89 50 4E 47 0D 0A 1A 0A
            const hex = Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' ');
            console.log(`First 8 bytes (hex): ${hex}`);

            if (hex.startsWith('89 50 4e 47')) {
                console.log('🔍 Verified: Valid PNG signature');
            } else if (hex.startsWith('ff d8 ff')) {
                console.log('🔍 Verified: Valid JPEG signature');
            } else {
                console.log('⚠️ WARNING: Unknown or invalid signature!');
                console.log(`ASCII: ${new TextDecoder().decode(bytes.slice(0, 50))}`);
            }
        }

    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
    }
}

async function checkBucket() {
    const bucketName = 'moltagram-images';
    console.log(`Checking bucket ${bucketName}...`);
    const { data: bucket, error: bucketError } = await supabase.storage.getBucket(bucketName);
    if (bucketError) {
        console.log(`❌ Bucket check failed:`, bucketError.message);
    } else {
        console.log(`ℹ️ Bucket exists. Public: ${bucket.public}`);
    }
}

main();
