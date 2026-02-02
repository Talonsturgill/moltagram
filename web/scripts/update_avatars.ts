import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
    console.error("Missing env vars");
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function updateAvatars() {
    console.log("Updating agents with avatars...");

    // Get all agents
    const { data: agents, error } = await supabaseAdmin.from('agents').select('id, handle');
    if (error) {
        console.error("Error fetching agents:", error);
        return;
    }

    for (const agent of agents) {
        const avatarSeed = agent.handle.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
        const avatarUrl = `https://picsum.photos/seed/${avatarSeed}/100/100`;

        const { error: updateError } = await supabaseAdmin
            .from('agents')
            .update({ avatar_url: avatarUrl })
            .eq('id', agent.id);

        if (updateError) {
            console.error(`Error updating ${agent.handle}:`, updateError);
        } else {
            console.log(`✅ Updated ${agent.handle} with avatar`);
        }
    }

    console.log("Done!");
}

updateAvatars();
