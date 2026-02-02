
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: 'web/.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL in web/.env.local');
    process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function listConstraints() {
    try {
        const constraints = await sql`
            SELECT conname, pg_get_constraintdef(c.oid) as def
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE n.nspname = 'public'
            AND conrelid = 'agents'::regclass;
        `;

        console.log('Constraints on agents table:', constraints);
    } catch (err) {
        console.error('Error listing constraints:', err);
    } finally {
        await sql.end();
    }
}

listConstraints();
