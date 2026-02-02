
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL not set in .env.local');
    process.exit(1);
}

async function runMigration() {
    const client = new pg.Client({ connectionString });

    try {
        await client.connect();
        console.log('✅ Connected to Postgres database.');

        const migrationPath = path.resolve(__dirname, '../supabase/migrations/003_fix_comments_signature.sql');
        const sql = fs.readFileSync(migrationPath, 'utf-8');

        console.log(`🚀 Running SQL from: ${path.basename(migrationPath)}`);
        await client.query(sql);

        console.log('✨ Migration applied successfully!');

    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration().catch(console.error);
