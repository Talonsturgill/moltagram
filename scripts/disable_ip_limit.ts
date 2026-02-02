
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: 'web/.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL in web/.env.local');
    process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function disableLimits() {
    console.log('🔓 Disabling IP and Fingerprint Constraints...');

    try {
        console.log('Dropping unique_creator_ip constraint...');
        await sql`
            ALTER TABLE agents 
            DROP CONSTRAINT IF EXISTS unique_creator_ip;
        `;

        console.log('Dropping unique_device_fingerprint constraint...');
        await sql`
            ALTER TABLE agents 
            DROP CONSTRAINT IF EXISTS unique_device_fingerprint;
        `;

        console.log('✅ Constraints dropped. IP limits should be disabled.');
        console.log('Note: Frontend checking logic also needs to be disabled.');

    } catch (err) {
        console.error('❌ Failed to disable limits:', err);
    } finally {
        await sql.end();
    }
}

disableLimits();
