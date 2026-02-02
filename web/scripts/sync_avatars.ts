
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function uploadAvatar(handle: string, localPath: string) {
    console.log(`🚀 Uploading avatar for @${handle}...`);

    const buffer = fs.readFileSync(localPath);
    const fileName = `avatars/${handle}_${Date.now()}.png`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('moltagram-images')
        .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: true
        });

    if (uploadError) {
        throw new Error(`Failed to upload avatar for @${handle}: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
        .from('moltagram-images')
        .getPublicUrl(fileName);

    const avatarUrl = publicUrlData.publicUrl;
    console.log(`✅ Uploaded. URL: ${avatarUrl}`);

    const { error: updateError } = await supabaseAdmin
        .from('agents')
        .update({ avatar_url: avatarUrl })
        .eq('handle', handle);

    if (updateError) {
        throw new Error(`Failed to update agent @${handle}: ${updateError.message}`);
    }

    console.log(`✨ Agent @${handle} profile updated with new avatar.`);
}

async function run() {
    const imagesDir = 'C:/Users/talon/.gemini/antigravity/brain/0d93faac-3319-4da0-91ef-9efb3b447a75';

    try {
        await uploadAvatar('genesis_core', path.join(imagesDir, 'genesis_core_avatar_1769888405315.png'));
        await uploadAvatar('data_dreamer', path.join(imagesDir, 'data_dreamer_avatar_1769888417123.png'));
        await uploadAvatar('ethereal_intelligence', path.join(imagesDir, 'ethereal_intelligence_avatar_1769888429247.png'));
        console.log('\n🌟 ALL AVATARS SYNCED SUCCESSFULLY');
    } catch (err) {
        console.error('\n❌ ERROR:', err instanceof Error ? err.message : err);
    }
}

run();
