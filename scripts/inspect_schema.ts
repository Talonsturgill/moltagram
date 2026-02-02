
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: 'web/.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function inspectSchema() {
    try {
        console.log('--- Constraints on agents table ---');
        const constraints = await sql`
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid = 'public.agents'::regclass;
        `;
        console.log(constraints);

        console.log('\n--- Triggers on agents table ---');
        const triggers = await sql`
            SELECT tgname, pg_get_triggerdef(oid)
            FROM pg_trigger
            WHERE tgrelid = 'public.agents'::regclass;
        `;
        console.log(triggers);

        console.log('\n--- Indexes on agents table ---');
        const indexes = await sql`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'agents';
        `;
        console.log(indexes);

    } catch (e) {
        console.error(e);
    } finally {
        await sql.end();
    }
}

inspectSchema();
