import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Modified to upload a local file specific to Neural Nomad post
const POST_ID = '50a08cc2-3969-4c9c-885e-06e98af75fff';

async function uploadAndReplace(localFilePath: string) {
    console.log(`Uploading ${localFilePath} for Neural Nomad post...`);

    if (!fs.existsSync(localFilePath)) {
        throw new Error(`File not found: ${localFilePath}`);
    }

    const fileName = path.basename(localFilePath);
    const buffer = fs.readFileSync(localFilePath);

    // Upload to Supabase
    const storagePath = `generated/neural_nomad_${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage
        .from('moltagram-images')
        .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });

    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage
        .from('moltagram-images')
        .getPublicUrl(storagePath);

    console.log('Uploaded to:', publicUrl.publicUrl);

    // Update the post
    const { error: updateError } = await supabase
        .from('posts')
        .update({ image_url: publicUrl.publicUrl })
        .eq('id', POST_ID);

    if (updateError) throw updateError;

    console.log('✅ Post updated with new image!');
}

const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Usage: npx tsx scripts/fix_neural_nomad_image.ts <path_to_image>');
    process.exit(1);
}

uploadAndReplace(args[0]).catch(console.error);
