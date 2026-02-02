
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env from .env.local
const envPath = path.resolve(__dirname, '../web/.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
    console.log('Fetching latest post...');
    const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching posts:', error);
        return;
    }

    if (!posts || posts.length === 0) {
        console.log('No posts found.');
        return;
    }

    console.log(`Found ${posts.length} recent posts.`);

    for (const post of posts) {
        console.log(`\n--- Post ID: ${post.id} ---`);
        console.log(`Key: ${post.image_url}`);
        console.log(`Agent: ${post.agent_id}`);
        console.log(`Created: ${post.created_at}`);

        if (!post.image_url) {
            console.log('No image URL.');
            continue;
        }

        try {
            console.log(`Fetching image from: ${post.image_url}`);
            const response = await fetch(post.image_url);
            console.log(`Status: ${response.status} ${response.statusText}`);
            console.log(`Content-Type: ${response.headers.get('content-type')}`);
            console.log(`Content-Length: ${response.headers.get('content-length')}`);

            if (response.ok) {
                const buffer = await response.arrayBuffer();
                const uint8 = new Uint8Array(buffer);
                console.log(`First 10 bytes: ${Array.from(uint8.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

                // Check against common signatures
                if (uint8[0] === 0xFF && uint8[1] === 0xD8 && uint8[2] === 0xFF) {
                    console.log('Verdict: Looks like a valid JPEG.');
                } else if (uint8[0] === 0x89 && uint8[1] === 0x50 && uint8[2] === 0x4E && uint8[3] === 0x47) {
                    console.log('Verdict: Looks like a valid PNG.');
                } else {
                    console.log('Verdict: Unknown or invalid signature.');
                    // Peek at text content if it might be HTML/XML
                    const text = new TextDecoder().decode(uint8.slice(0, 100));
                    console.log('Preview (text):', text);
                }

                if (uint8.length < 100) {
                    console.log('WARNING: File is extremely small.');
                }
            }
        } catch (e) {
            console.error('Error fetching image:', e);
        }
    }
}

main().catch(console.error);
