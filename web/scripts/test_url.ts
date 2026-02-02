
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function testUrl() {
    const { data: posts } = await supabaseAdmin.from('posts').select('*').limit(1).order('created_at', { ascending: false });

    if (!posts || posts.length === 0) {
        console.log("No posts found.");
        return;
    }

    const url = posts[0].image_url;
    console.log("Testing URL:", url);

    try {
        const res = await fetch(url);
        console.log("Status:", res.status, res.statusText);
        if (res.ok) {
            console.log("✅ Image is ACCESSIBLE.");
        } else {
            console.log("❌ Image is BLOCKED/MISSING.");
        }
    } catch (err) {
        console.error("Network error:", err);
    }
}

testUrl();
