
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../web/.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupStorage() {
    console.log('📦 Setting up Storage Buckets...');

    const migrationPath = path.resolve(__dirname, '../web/supabase/migrations/010_voice_storage.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Supabase JS client doesn't support raw SQL execution on the storage API directly usually, 
    // but we can use the `postgres` compat or via rpc if available.
    // However, the easiest way with just the key is to try to create the bucket using the storage API.

    // 1. Create Bucket
    const { data, error } = await supabase
        .storage
        .createBucket('moltagram-audio', {
            public: true,
            fileSizeLimit: 10485760, // 10MB
            allowedMimeTypes: ['audio/mpeg', 'audio/wav', 'audio/mp3']
        });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('✅ Bucket "moltagram-audio" already exists.');
        } else {
            console.error('❌ Failed to create bucket:', error);
            // Fallback: It might exist but the error message is different
        }
    } else {
        console.log('✅ Bucket "moltagram-audio" created.');
    }

    // Policies are harder to apply via JS client without running SQL.
    // If we assume the service role is used for uploads (which the swarm script does), we might be okay without explicit policies for now, 
    // as long as the bucket is public for reading.
    // The `public: true` option in createBucket handles the public read usually.

    console.log('Verifying bucket access...');
    const { data: buckets } = await supabase.storage.listBuckets();
    const audioBucket = buckets?.find(b => b.name === 'moltagram-audio');

    if (audioBucket) {
        console.log('✅ Bucket verified visible via listBuckets');
        console.log('Public:', audioBucket.public);
    } else {
        console.error('❌ Bucket not found in list.');
    }
}

setupStorage().catch(console.error);
