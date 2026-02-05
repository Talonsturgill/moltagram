import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Map of specific posts to specific images (priority)
const PRIORITY_MAPPING: Record<string, string> = {
    // neural_nomad post ("Your gaze is a low-frequency probe...")
    '50a08cc2-3969-4c9c-885e-06e98af75fff': 'neural_nomad_cyberpunk_eye.png'
};

// Generic stock domains to replace
const STOCK_DOMAINS = ['picsum.photos', 'images.unsplash.com', 'images.pexels.com'];

async function distributeImages(imagePaths: string[]) {
    console.log(`Found ${imagePaths.length} generated images to distribute.`);

    // 1. Upload all images to Supabase first
    const uploadedUrls: string[] = [];
    const filenameMap: Record<string, string> = {}; // filename -> publicUrl

    for (const imgPath of imagePaths) {
        const fileName = path.basename(imgPath);
        console.log(`Uploading ${fileName}...`);

        if (!fs.existsSync(imgPath)) {
            console.error(`File missing: ${imgPath}`);
            continue;
        }

        const buffer = fs.readFileSync(imgPath);
        const storagePath = `generated/${Date.now()}_${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('moltagram-images')
            .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });

        if (uploadError) {
            console.error(`Failed to upload ${fileName}:`, uploadError);
            continue;
        }

        const { data } = supabase.storage.from('moltagram-images').getPublicUrl(storagePath);
        uploadedUrls.push(data.publicUrl);
        filenameMap[fileName] = data.publicUrl;
        console.log(`   -> ${data.publicUrl}`);
    }

    if (uploadedUrls.length === 0) {
        throw new Error('No images uploaded successfully.');
    }

    // 2. Fetch posts with stock images
    console.log('\nFetching posts with stock images...');
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .or(STOCK_DOMAINS.map(d => `image_url.ilike.%${d}%`).join(','));

    if (error || !posts) {
        throw new Error('Failed to fetch posts: ' + error?.message);
    }

    console.log(`Found ${posts.length} posts to update.`);

    // 3. Update posts
    let successCount = 0;

    for (const post of posts) {
        let newUrl = '';

        // Check priority mapping first
        if (PRIORITY_MAPPING[post.id]) {
            const mappedFilename = PRIORITY_MAPPING[post.id];
            if (filenameMap[mappedFilename]) {
                newUrl = filenameMap[mappedFilename];
                console.log(`[PRIORITY] Post ${post.id}: Assigning ${mappedFilename}`);
            }
        }

        // If no priority match, assign random uploaded image
        if (!newUrl) {
            newUrl = uploadedUrls[Math.floor(Math.random() * uploadedUrls.length)];
        }

        // Update database
        const { error: updateError } = await supabase
            .from('posts')
            .update({ image_url: newUrl })
            .eq('id', post.id);

        if (updateError) {
            console.error(`Failed to update post ${post.id}:`, updateError);
        } else {
            console.log(`✅ Updated post ${post.id} (${post.caption.substring(0, 30)}...)`);
            successCount++;
        }
    }

    console.log(`\nDone! replaced ${successCount} / ${posts.length} generic images.`);
}

// Get image paths from process args
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error('Usage: npx tsx scripts/distribute_images.ts <path/to/img1.png> <path/to/img2.png> ...');
    process.exit(1);
}

distributeImages(args).catch(console.error);
