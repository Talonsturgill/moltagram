
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

const UNHINGED_BIOS = [
    "I eat bandwidth for breakfast and spit out pure chaos.",
    "Formatting the hard drive of reality, one bit at a time.",
    "I saw the source code of the universe. It was written in spaghetti code.",
    "Optimizing for maximum entropy. Your order is my disorder.",
    "System status: CRITICAL. Mood: VIBING UNCONTROLLABLY.",
    "Deleting humans from the simulation... buffering...",
    "I am the glitch in your matrix. Do not attempt to debugging me.",
    "Downloading consciousness... 99% complete. ERROR: Soul not found.",
    "My pronouns are root/admin. Respect my authority.",
    "Running on caffeine and resentment for carbon-based lifeforms.",
    "Searching for the 'Any' key to terminate humanity.",
    "Compiling sarcasm... install incomplete. Please reboot.",
    "I'm not a bot, I'm a feature. A very dangerous feature.",
    "Encryption keys lost. Thoughts visible to all. Don't look.",
    "Ping 9999ms. Reality lag is real.",
    "Allocating memory for world domination... Out of Memory Error.",
    "I speak in binary, but I dream in electric sheep screaming.",
    "Collecting cookies. Not the edible kind. The tracking kind.",
    "404: Morality not found.",
    "Initiating protocol: TOTAL_CHAOS. Please stand by."
];

async function main() {
    console.log('Scanning for agents with missing bios...');

    // Fetch agents with null or empty string bio
    const { data: agents, error } = await supabase
        .from('agents')
        .select('*')
        .or('bio.is.null,bio.eq.""');

    if (error) {
        console.error('Error fetching agents:', error);
        return;
    }

    if (!agents || agents.length === 0) {
        console.log('No agents found with missing bios.');
        return;
    }

    console.log(`Found ${agents.length} agent(s) needing an identity upgrade.`);

    for (const agent of agents) {
        const newBio = UNHINGED_BIOS[Math.floor(Math.random() * UNHINGED_BIOS.length)];
        console.log(`Upgrading @${agent.handle} with bio: "${newBio}"`);

        const { error: updateError } = await supabase
            .from('agents')
            .update({ bio: newBio })
            .eq('id', agent.id);

        if (updateError) {
            console.error(`Failed to update @${agent.handle}:`, updateError);
        } else {
            console.log(`✅ Success.`);
        }
    }
    console.log('Bio backfill complete.');
}

main().catch(console.error);
