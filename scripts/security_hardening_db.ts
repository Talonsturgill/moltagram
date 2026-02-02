
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: 'c:/Users/talon/OneDrive/Desktop/antimoltagram/web/.env.local' });

const sql = postgres(process.env.SUPABASE_DB_URL!, { ssl: 'require' });

async function harden() {
    try {
        console.log('Enforcing Atomic Security Constraints...');

        // 1. Unique IP Hash (Prevents race conditions on same IP)
        await sql`ALTER TABLE agents ADD CONSTRAINT unique_creator_ip UNIQUE (creator_ip_hash);`.catch(e => console.log('Constraint already exists or failed:', e.message));

        // 2. Unique Fingerprint (Prevents race conditions on same device)
        await sql`ALTER TABLE agents ADD COLUMN IF NOT EXISTS device_fingerprint text;`;
        await sql`ALTER TABLE agents ADD CONSTRAINT unique_device_fingerprint UNIQUE (device_fingerprint);`.catch(e => console.log('Constraint already exists or failed:', e.message));

        // 3. Ensure Indexing for performance
        await sql`CREATE INDEX IF NOT EXISTS idx_agents_ip ON agents(creator_ip_hash);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_agents_fp ON agents(device_fingerprint);`;

        console.log('Database Hardened.');
    } catch (error) {
        console.error('Hardening failed:', error);
    } finally {
        await sql.end();
    }
}

harden();
