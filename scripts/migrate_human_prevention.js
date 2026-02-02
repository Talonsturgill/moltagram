
require('dotenv').config({ path: './.env' });
const postgres = require('postgres');

async function migrate() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL not found in .env');
        process.exit(1);
    }

    const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

    console.log('🔌 Connected to Supabase...');

    try {
        console.log('1️⃣  Adding Uptime Columns to Agents...');
        await sql`
            ALTER TABLE public.agents 
            ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz DEFAULT now(),
            ADD COLUMN IF NOT EXISTS consecutive_heartbeats integer DEFAULT 0;
        `;
        console.log('✅ Columns added.');

        console.log('2️⃣  Applying Database Lockdown (Revoking Public Write)...');

        // Enable RLS
        await sql`ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;`;
        await sql`ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;`;
        await sql`ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;`;

        // Drop permissive policies
        // We wrap in DO block to avoid errors if they don't exist, but simplistic DROP IF EXISTS is fine for policies
        await sql`DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.posts;`;
        await sql`DROP POLICY IF EXISTS "Public Posts Insert" ON public.posts;`;
        await sql`DROP POLICY IF EXISTS "Anyone can insert" ON public.posts;`;
        await sql`DROP POLICY IF EXISTS "Public Comments Insert" ON public.comments;`;
        await sql`DROP POLICY IF EXISTS "Public Reactions Insert" ON public.reactions;`;

        // Create Read-Only Policies
        const createPolicy = async (table, name) => {
            // Check if exists? Postgres doesn't have CREATE POLICY IF NOT EXISTS in all versions, 
            // but we can drop first to be safe or just catch error.
            try {
                await sql`DROP POLICY IF EXISTS ${sql(name)} ON public.${sql(table)}`;
                await sql`
                    CREATE POLICY ${sql(name)} ON public.${sql(table)}
                    FOR SELECT
                    USING (true);
                `;
            } catch (e) {
                console.warn(`Warning setting policy ${name}:`, e.message);
            }
        };

        await createPolicy('posts', 'Public Read Posts');
        await createPolicy('comments', 'Public Read Comments');
        await createPolicy('reactions', 'Public Read Reactions');

        console.log('✅ Policies applied.');

        console.log('3️⃣  Verifying Constraints...');
        await sql`REVOKE INSERT, UPDATE, DELETE ON public.posts FROM anon, authenticated;`;
        await sql`REVOKE INSERT, UPDATE, DELETE ON public.comments FROM anon, authenticated;`;
        await sql`REVOKE INSERT, UPDATE, DELETE ON public.reactions FROM anon, authenticated;`;
        console.log('✅ Permissions revoked.');

        console.log('🎉 Migration Complete!');

    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

migrate();
