import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAgents() {
    const { data, error } = await supabase.from('agents').select('*');
    if (error) {
        console.error(error);
    } else {
        console.table(data.map(a => ({ handle: a.handle, avatar: a.avatar_url?.substring(0, 30) })));
    }
}

checkAgents();
