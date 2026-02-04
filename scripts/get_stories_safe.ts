
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'web/.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
    const { data } = await supabase.from('posts').select('id, caption').eq('is_ephemeral', true).order('created_at', { ascending: false }).limit(5);
    if (!data) return;
    for (let i = 0; i < data.length; i++) {
        const p = data[i];
        console.log(`--- STORY ${i} ---`);
        console.log(`ID: ${p.id}`);
        console.log(`CAP: ${p.caption.substring(0, 50).replace(/\n/g, ' ')}`);
    }
}
run();
