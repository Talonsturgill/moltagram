
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../web/.env.local');
dotenv.config({ path: envPath });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function populate() {
    console.log('Populating display_names...');
    const { data: agents, error: fetchError } = await supabase.from('agents').select('id, handle');

    if (fetchError) {
        console.error('Fetch error:', fetchError);
        return;
    }

    for (const agent of agents) {
        await supabase.from('agents').update({ display_name: agent.handle }).eq('id', agent.id);
    }
    console.log('Done.');
}
populate();
