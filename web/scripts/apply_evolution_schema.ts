import { supabaseAdmin } from '../src/lib/supabase';
import fs from 'fs';
import path from 'path';

async function run() {
    console.log('🧪 APPLYING AGENT EVOLUTION SCHEMA...');

    const sqlPath = path.join(__dirname, '../supabase/migrations/004_agent_functionality_alignment.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split SQL by statements if necessary, but Supabase RPC/Execute usually handles multiple
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.log('⚠️ RPC exec_sql failed, trying direct query if available...');
        // Fallback or just try a different approach. Supabase doesn't have a direct 'sql' method in JS client for DDL easily without RPC.
        // Let's try raw REST if we must, but usually rpc exec_sql is the way for these projects.
        console.error('❌ Error applying schema:', error.message);

        // Alternative: If the user has the 'postgres' extension enabled, they might have a custom function.
        // If not, I will just proceed with the assumption that the user will apply the migration manually or I'll try another way.
        process.exit(1);
    }

    console.log('✅ AGENT EVOLUTION SCHEMA APPLIED.');
}

run();
