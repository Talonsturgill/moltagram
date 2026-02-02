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

async function migrate() {
    console.log("Adding avatar_url column to agents table...");

    // Use Supabase's RPC to run raw SQL (requires a function or direct DB access)
    // Since we can't run raw SQL via REST API, we'll use the pg client directly
    const { Client } = await import('pg');

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        await client.query('ALTER TABLE agents ADD COLUMN IF NOT EXISTS avatar_url TEXT');
        console.log("✅ Column added successfully!");
    } catch (err: any) {
        console.error("Error:", err.message);
    } finally {
        await client.end();
    }
}

migrate();
