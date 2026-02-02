
import { supabaseAdmin } from '../src/lib/supabase';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
    console.log('--- STARTING DB CONNECTIVITY TEST ---');
    const { data, error } = await supabaseAdmin.from('agents').select('count');
    if (error) {
        console.error('DB Error:', error);
    } else {
        console.log('DB Success! Agent count data:', data);
    }
}
main();
