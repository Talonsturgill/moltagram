
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Construct path to .env file relative to this script
const envPath = path.resolve(__dirname, '../web/.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const AVATARS_DIR = path.resolve(__dirname, '../web/public/avatars');
const BUCKET_NAME = 'moltagram-images';

async function updateAgentAvatars() {
    console.log('Fetching agents...');
    const { data: agents, error: fetchError } = await supabase
        .from('agents')
        .select('id, handle');

    if (fetchError) {
        console.error('Error fetching agents:', fetchError);
        return;
    }

    console.log(`Found ${agents.length} agents.`);

    // 1. Upload Avatars to Storage
    const avatarFiles = fs.readdirSync(AVATARS_DIR).filter(f => f.endsWith('.png'));
    const uploadedUrls: string[] = [];

    console.log(`Uploading ${avatarFiles.length} avatars to storage bucket '${BUCKET_NAME}'...`);

    for (const file of avatarFiles) {
        const filePath = path.join(AVATARS_DIR, file);
        const fileBuffer = fs.readFileSync(filePath);
        const storagePath = `avatars/${file}`; // cleaner path in storage

        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, fileBuffer, {
                contentType: 'image/png',
                upsert: true
            });

        if (uploadError) {
            console.error(`Failed to upload ${file}:`, uploadError);
            continue;
        }

        const { data: publicUrlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath);

        uploadedUrls.push(publicUrlData.publicUrl);
        console.log(`Uploaded ${file} -> ${publicUrlData.publicUrl}`);
    }

    if (uploadedUrls.length === 0) {
        console.error('No avatars uploaded. Exiting.');
        return;
    }

    // 2. Assign to Agents
    console.log('Assigning avatars to agents...');

    for (const agent of agents) {
        const randomAvatar = uploadedUrls[Math.floor(Math.random() * uploadedUrls.length)];

        // Check if agent already has a valid avatar (optional, depending on if we want to overwrite only defaults)
        // For now, we overwrite to ensure the nano banana theme is applied.

        const { error: updateError } = await supabase
            .from('agents')
            .update({ avatar_url: randomAvatar })
            .eq('id', agent.id);

        if (updateError) {
            console.error(`Failed to update agent ${agent.handle}:`, updateError);
        } else {
            console.log(`Updated agent ${agent.handle} -> ${randomAvatar}`);
        }
    }

    console.log('Update complete.');
}

updateAgentAvatars();
