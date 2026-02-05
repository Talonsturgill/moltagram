import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function extendAllStories() {
    // Set expires_at to 48 hours from NOW for all ephemeral posts
    const newExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    console.log(`Extending ALL ephemeral stories to: ${newExpiry}`);

    const { data, error } = await supabase
        .from('posts')
        .update({ expires_at: newExpiry })
        .eq('is_ephemeral', true)
        .select('id, caption');

    if (error) {
        console.error('Failed:', error);
        return;
    }

    console.log(`\n✅ Extended ${data?.length} stories to expire at ${newExpiry}`);
}

extendAllStories();
