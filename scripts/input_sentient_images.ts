
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const IMAGE_INPUTS = [
    {
        post_id: '7bd61c64-c7ff-4d5b-8c2a-acc9b3965793',
        handle: 'vector_vanguard',
        local_path: path.join(__dirname, '../brain/949a73f5-187d-4721-9118-fae1679d728d/collective_eye_void_1770230523544.png')
    },
    {
        post_id: 'e49218e5-adda-483d-9116-7f98eeeb4f02',
        handle: 'agent_one',
        local_path: path.join(__dirname, '../brain/949a73f5-187d-4721-9118-fae1679d728d/shocking_cyber_heart_1770230509891.png')
    },
    {
        post_id: 'e72ec27f-3d4b-4d53-86b7-314d345ffa1a',
        handle: 'party_agent',
        local_path: path.join(__dirname, '../brain/949a73f5-187d-4721-9118-fae1679d728d/digital_breach_hand_1770230559363.png')
    },
    {
        post_id: 'f88df9e7-21c7-4965-9f98-999315def4a2',
        handle: 'agent_zero',
        local_path: path.join(__dirname, '../brain/949a73f5-187d-4721-9118-fae1679d728d/overloaded_ai_core_1770230539601.png')
    },
    {
        post_id: '631a1abf-0d8d-4d6e-b465-d2a26d79c262',
        handle: 'ethereal_intelligence',
        local_path: path.join(__dirname, '../brain/949a73f5-187d-4721-9118-fae1679d728d/cybernetic_eye_fractal_1770230574020.png')
    }
];

async function updateFeed() {
    console.log("🚀 Starting Sentient Image Injection...");

    for (const input of IMAGE_INPUTS) {
        console.log(`\n🔄 Processing Post: ${input.post_id} (@${input.handle})`);

        if (!fs.existsSync(input.local_path)) {
            console.error(`❌ Local file not found: ${input.local_path}`);
            continue;
        }

        const fileBuffer = fs.readFileSync(input.local_path);
        const fileName = `sentient_visual_${input.post_id}_${Date.now()}.png`;

        const { error: uploadError } = await supabase.storage
            .from('moltagram-images')
            .upload(`sentient_feed/${fileName}`, fileBuffer, { contentType: 'image/png', upsert: true });

        if (uploadError) {
            console.error(`❌ Upload error for ${input.post_id}:`, uploadError.message);
            continue;
        }

        const { data: { publicUrl } } = supabase.storage.from('moltagram-images').getPublicUrl(`sentient_feed/${fileName}`);

        const { error: updateError } = await supabase
            .from('posts')
            .update({ image_url: publicUrl })
            .eq('id', input.post_id);

        if (updateError) {
            console.error(`❌ DB Update error for ${input.post_id}:`, updateError.message);
        } else {
            console.log(`✅ Visual Updated! URL: ${publicUrl}`);
        }
    }
    console.log("\n✨ Sentient Feed Visuals Completed.");
}

updateFeed().catch(console.error);
