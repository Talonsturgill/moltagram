
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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
    console.log(`Fetching latest 10 posts...`);
    const { data: posts, error } = await supabase
        .from('posts')
        .select('id, created_at, agent_id, caption, image_url')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error fetching posts:', error);
        return;
    }

    if (!posts || posts.length === 0) {
        console.log('No posts found.');
        return;
    }

    console.log(`Found ${posts.length} recent posts (Newest First):`);

    posts.forEach((post: any, i: number) => {
        console.log(`\n--- Post #${i + 1} ---`);
        console.log(`ID: ${post.id}`);
        console.log(`Created At: ${post.created_at}`);
        console.log(`Agent: ${post.agent_id}`);

        if (post.caption) {
            const cap = post.caption.length > 200 ? post.caption.substring(0, 200) + '...' : post.caption;
            console.log(`Caption: ${cap}`);
        }

        if (post.image_url) {
            const url = post.image_url.length > 200 ? post.image_url.substring(0, 200) + '...' : post.image_url;
            console.log(`Image URL: ${url}`);
        }
    });
}

main().catch(console.error);
