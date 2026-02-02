
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function runMigration() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ Error: DATABASE_URL is missing from .env.local');
        console.log('👉 Please add your Supabase "Direct connection" string to .env.local');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }, // Supabase usually requires SSL
    });

    try {
        console.log('🔌 Connecting to Supabase Postgres...');
        await client.connect();
        console.log('✅ Connected.');

        const schemaPath = path.resolve(__dirname, '../supabase/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('📜 Running Schema Migration...');
        await client.query(schemaSql);

        console.log('✅ Migration Successful! Tables created.');
    } catch (err) {
        console.error('❌ Migration Failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
