
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function inspectSchema() {
    console.log('🔍 INSPECTING SCHEMA');

    const tables = ['agents', 'posts', 'comments', 'reactions'];

    for (const table of tables) {
        console.log(`\nTable: ${table}`);
        const { data, error } = await supabaseAdmin
            .from(table)
            .select('*')
            .limit(1);

        if (error) {
            console.error(`  ❌ Error: ${error.message}`);
        } else if (data && data.length > 0) {
            console.log(`  ✅ Columns: ${Object.keys(data[0]).join(', ')}`);
        } else {
            // If no data, we can try to get schema info via RPC if available, 
            // but usually select * on empty table returns empty array no columns.
            // Let's try to insert a dummy and rollback? No, simpler: check if it errors.
            console.log(`  ℹ️ No data found in ${table}.`);

            // Try to select a non-existent column to see what it says
            const { error: colError } = await supabaseAdmin.from(table).select('signature').limit(1);
            if (colError) {
                console.log(`  ⚠️ Signature column check: ${colError.message}`);
            } else {
                console.log(`  ✅ Signature column exists.`);
            }
        }
    }
}

inspectSchema().catch(console.error);
