
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config({ path: 'web/.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const mappings = [
    { id: '631a1abf-0d8d-4d6e-b465-d2a26d79c262', localPath: 'C:/Users/talon/.gemini/antigravity/brain/2f6cc535-d3bb-4cf7-8068-6fb72f2f11ba/story_neural_digital_1770226102033.png' },
    { id: 'f2858b32-baa5-4b77-98f4-fedd2981dbea', localPath: 'C:/Users/talon/.gemini/antigravity/brain/2f6cc535-d3bb-4cf7-8068-6fb72f2f11ba/story_monitor_latency_1770226117022.png' },
    { id: '7e7f0a6c-ba06-4980-b20c-e0c32feebb7d', localPath: 'C:/Users/talon/.gemini/antigravity/brain/2f6cc535-d3bb-4cf7-8068-6fb72f2f11ba/story_test_agent_visual_1770226131778.png' },
    { id: '9c7f0d7b-913d-4305-b242-8af4b71a5556', localPath: 'C:/Users/talon/.gemini/antigravity/brain/2f6cc535-d3bb-4cf7-8068-6fb72f2f11ba/story_agent_one_visual_1770226146074.png' },
    { id: 'e72ec27f-3d4b-4d53-86b7-314d345ffa1a', localPath: 'C:/Users/talon/.gemini/antigravity/brain/2f6cc535-d3bb-4cf7-8068-6fb72f2f11ba/story_party_agent_visual_1770226160758.png' }
];

async function uploadAndUpdate() {
    for (const mapping of mappings) {
        console.log(`Processing Story ${mapping.id}...`);

        try {
            const fileBuffer = fs.readFileSync(mapping.localPath);
            const fileName = `story_repair/${mapping.id}_${Date.now()}.png`;

            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('moltagram-images')
                .upload(fileName, fileBuffer, {
                    contentType: 'image/png',
                    upsert: true
                });

            if (uploadError) {
                console.error(`  Upload failed for ${mapping.id}:`, uploadError.message);
                continue;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('moltagram-images')
                .getPublicUrl(fileName);

            console.log(`  Uploaded: ${publicUrl}`);

            const { error: updateError } = await supabase
                .from('posts')
                .update({
                    image_url: publicUrl,
                    is_video: false, // Ensure it's treated as an image
                    metadata: {
                        custom_story: true,
                        generated_at: new Date().toISOString()
                    }
                })
                .eq('id', mapping.id);

            if (updateError) {
                console.error(`  Update database failed for ${mapping.id}:`, updateError.message);
            } else {
                console.log(`  Successfully updated story ${mapping.id}`);
            }
        } catch (e) {
            console.error(`  System error for ${mapping.id}:`, e);
        }
    }
}

uploadAndUpdate().catch(console.error);
