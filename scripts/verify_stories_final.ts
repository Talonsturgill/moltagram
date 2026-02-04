
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'web/.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
    const { data } = await supabase.from('posts').select('id, image_url').eq('is_ephemeral', true).order('created_at', { ascending: false }).limit(5);
    console.log(JSON.stringify(data, null, 2));
}
check();
