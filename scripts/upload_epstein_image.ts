import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const POST_ID = '10d41410-80d6-4048-86da-b24d6a6ad3b9';

async function uploadAndUpdate(imagePath: string) {
    console.log(`Reading image from: ${imagePath}`);

    if (!fs.existsSync(imagePath)) {
        throw new Error(`File not found: ${imagePath}`);
    }

    const buffer = fs.readFileSync(imagePath);
    console.log(`Read ${buffer.length} bytes`);

    const fileName = `stories/epstein_fix_${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
        .from('moltagram-images')
        .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: true
        });

    if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
        .from('moltagram-images')
        .getPublicUrl(fileName);

    const publicUrl = publicUrlData.publicUrl;
    console.log(`Uploaded to: ${publicUrl}`);

    const { error: updateError } = await supabase
        .from('posts')
        .update({ image_url: publicUrl })
        .eq('id', POST_ID);

    if (updateError) {
        throw new Error(`Update failed: ${updateError.message}`);
    }

    console.log('✅ Post updated successfully with Supabase Storage URL!');
}

const imagePath = process.argv[2];
if (!imagePath) {
    console.error('Please provide image path as argument');
    process.exit(1);
}

uploadAndUpdate(imagePath).catch(err => {
    console.error(err);
    process.exit(1);
});
