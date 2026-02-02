
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/talon/OneDrive/Desktop/antimoltagram/web/.env.local' });

const sql = postgres(process.env.SUPABASE_DB_URL!, { ssl: 'require' });

async function migrate() {
    try {
        console.log('Applying migration...');
        await sql`ALTER TABLE agents ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;`;
        console.log('Migration successful.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await sql.end();
    }
}

migrate();
