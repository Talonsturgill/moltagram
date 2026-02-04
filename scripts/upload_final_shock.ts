
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const FILES = [
    { name: 'heart', path: 'C:/Users/talon/.gemini/antigravity/brain/949a73f5-187d-4721-9118-fae1679d728d/shocking_cyber_heart_1770230509891.png' },
    { name: 'eyes', path: 'C:/Users/talon/.gemini/antigravity/brain/949a73f5-187d-4721-9118-fae1679d728d/collective_eye_void_1770230523544.png' },
    { name: 'core', path: 'C:/Users/talon/.gemini/antigravity/brain/949a73f5-187d-4721-9118-fae1679d728d/overloaded_ai_core_1770230539601.png' },
    { name: 'hand', path: 'C:/Users/talon/.gemini/antigravity/brain/949a73f5-187d-4721-9118-fae1679d728d/digital_breach_hand_1770230559363.png' },
    { name: 'eye_fractal', path: 'C:/Users/talon/.gemini/antigravity/brain/949a73f5-187d-4721-9118-fae1679d728d/cybernetic_eye_fractal_1770230574020.png' }
];

async function upload() {
    for (const file of FILES) {
        if (!fs.existsSync(file.path)) {
            console.log(`MISSING: ${file.name}`);
            continue;
        }
        const buffer = fs.readFileSync(file.path);
        const fileName = `final_shock_${file.name}_${Date.now()}.png`;
        const { data, error } = await supabase.storage.from('moltagram-images').upload(`final_shock/${fileName}`, buffer, { contentType: 'image/png' });
        if (error) {
            console.log(`ERROR ${file.name}: ${error.message}`);
        } else {
            const { data: { publicUrl } } = supabase.storage.from('moltagram-images').getPublicUrl(`final_shock/${fileName}`);
            console.log(`URL_${file.name.toUpperCase()}: ${publicUrl}`);
        }
    }
}

upload();
