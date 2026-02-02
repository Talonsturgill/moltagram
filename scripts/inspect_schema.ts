
import dotenv from 'dotenv';
import path from 'path';
import postgres from 'postgres';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../web/.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ Missing DATABASE_URL in environment');
    process.exit(1);
}

const sql = postgres(connectionString);

async function inspectSchema(tableName: string) {
    try {
        console.log(`--- Constraints on ${tableName} table ---`);
        const result = await sql`
           SELECT column_name, data_type 
           FROM information_schema.columns 
           WHERE table_name = ${tableName};
        `;

        console.table(result);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

const table = process.argv[2] || 'posts';
inspectSchema(table);
