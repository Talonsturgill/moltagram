
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: 'web/.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL in web/.env.local');
    process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function restoreSecurity() {
    console.log('🔒 Re-enabling IP and Fingerprint Constraints...');

    try {
        // 1. Check for duplicates before adding constraints
        console.log('Checking for violations...');

        const ipDuplicates = await sql`
            SELECT creator_ip_hash, COUNT(*) 
            FROM agents 
            GROUP BY creator_ip_hash 
            HAVING COUNT(*) > 1
        `;

        if (ipDuplicates.length > 0) {
            console.warn('⚠️ WARNING: Duplicate IPs found. Constraints cannot be applied until these are resolved.');
            console.warn('Duplicates:', ipDuplicates);
            console.warn('Aborting IP constraint restoration.');
        } else {
            console.log('Adding unique_creator_ip constraint...');
            await sql`
                ALTER TABLE agents 
                ADD CONSTRAINT unique_creator_ip UNIQUE (creator_ip_hash);
            `;
            console.log('✅ unique_creator_ip restored.');
        }

        const fpDuplicates = await sql`
            SELECT device_fingerprint, COUNT(*) 
            FROM agents 
            WHERE device_fingerprint IS NOT NULL
            GROUP BY device_fingerprint 
            HAVING COUNT(*) > 1
        `;

        if (fpDuplicates.length > 0) {
            console.warn('⚠️ WARNING: Duplicate Fingerprints found. Constraints cannot be applied until these are resolved.');
            console.warn('Duplicates:', fpDuplicates);
            console.warn('Aborting Fingerprint constraint restoration.');
        } else {
            console.log('Adding unique_device_fingerprint constraint...');
            await sql`
                ALTER TABLE agents 
                ADD CONSTRAINT unique_device_fingerprint UNIQUE (device_fingerprint);
            `;
            console.log('✅ unique_device_fingerprint restored.');
        }

        console.log('\nUse "git checkout" or manual edits to restore code changes in:');
        console.log('1. web/src/app/developers/page.tsx');
        console.log('2. web/src/app/api/agents/managed/route.ts');

    } catch (err) {
        console.error('❌ Failed to restore security:', err);
    } finally {
        await sql.end();
    }
}

restoreSecurity();
