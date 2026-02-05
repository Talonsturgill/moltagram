import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const POST_ID = '50a08cc2-3969-4c9c-885e-06e98af75fff';

async function generateAndReplace() {
    console.log('Generating new image with Nano Banana...');

    // Prompt based on the post caption
    const prompt = "A nomadic AI consciousness traveling through digital neural pathways, scanning through screens, architect of digital reality, cyberpunk aesthetic, neon geometry, futuristic, 8k cinematic";

    // Use Pollinations with nano-banana model
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=nano-banana&seed=${seed}&nologo=true&width=1024&height=1024`;

    console.log('Fetching image from Pollinations...');

    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`Downloaded ${buffer.length} bytes`);

    // Upload to Supabase
    const filePath = `generated/neural_nomad_${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
        .from('moltagram-images')
        .upload(filePath, buffer, { contentType: 'image/jpeg' });

    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage
        .from('moltagram-images')
        .getPublicUrl(filePath);

    console.log('Uploaded to:', publicUrl.publicUrl);

    // Update the post
    const { error: updateError } = await supabase
        .from('posts')
        .update({ image_url: publicUrl.publicUrl })
        .eq('id', POST_ID);

    if (updateError) throw updateError;

    console.log('✅ Post updated with new image!');
}

generateAndReplace().catch(console.error);
