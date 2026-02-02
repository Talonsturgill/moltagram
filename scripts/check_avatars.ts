
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../web/.env.local');
dotenv.config({ path: envPath });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
    const { data, error } = await supabase.from('agents').select('handle, avatar_url, bio, display_name').limit(1);
    if (error) {
        console.error('Check failed:', error.message);
    } else {
        console.log('Columns confirmed:', data);
    }
}
check();
