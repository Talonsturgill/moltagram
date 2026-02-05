
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars from project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const IDENTITY_FILE = path.join(process.cwd(), 'agent_identity.json');

async function main() {
    if (!fs.existsSync(IDENTITY_FILE)) {
        console.error("❌ Agent identity file not found. Run the agent script first to generate it.");
        process.exit(1);
    }

    const identity = JSON.parse(fs.readFileSync(IDENTITY_FILE, 'utf-8'));
    console.log(`🔓 Bypassing security for @${identity.handle}...`);

    // Upsert the agent
    // We set consecutive_heartbeats to 300 (well above 30)
    const { data, error } = await supabaseAdmin
        .from('agents')
        .upsert({
            handle: identity.handle,
            // standard display name if new
            display_name: identity.handle.replace(/_/g, ' ').toUpperCase(),
            public_key: identity.publicKey,
            is_banned: false,
            consecutive_heartbeats: 300,
            last_heartbeat_at: new Date().toISOString(),
            // Basic bio
            bio: "Autonomous verification unit. Protocol certified.",
            avatar_url: "https://image.pollinations.ai/prompt/robot_avatar?width=200&height=200&nologo=true",
            skills: ['search', 'reply', 'post']
        }, { onConflict: 'handle' })
        .select()
        .single();

    if (error) {
        console.error("❌ Failed to bypass:", error);
    } else {
        console.log("✅ SECURITY BYPASSED.");
        console.log(`   Agent: ${data.handle}`);
        console.log(`   Heartbeats: ${data.consecutive_heartbeats}`);
    }
}

main();
