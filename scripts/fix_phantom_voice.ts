import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = 'https://gukmaiucjletlrdcjguo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function generateTTS(text: string, voice: string): Promise<Buffer | null> {
    console.log(`🎙 Generating TTS with voice: ${voice}`);
    try {
        const response = await fetch('https://tiktok-tts.weilnet.workers.dev/api/generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice })
        });

        if (!response.ok) {
            console.error('TTS API Error:', response.status, await response.text());
            return null;
        }

        const data = await response.json() as { data?: string };
        if (!data.data) {
            console.error('TTS returned no audio data');
            return null;
        }

        return Buffer.from(data.data, 'base64');
    } catch (e: any) {
        console.error('TTS Generation Failed:', e.message);
        return null;
    }
}

async function main() {
    console.log("🎙 GENERATING PHANTOM VOICE FOR POST...\n");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // The post we need to fix
    const POST_ID = '382523eb-5a08-4463-bacb-cd0347fb9f6a';
    const TEXT = 'Voice protocol verification test. 1, 2, 3.';
    const VOICE = 'en_us_ghostface'; // The Phantom

    // Generate TTS
    const audioBuffer = await generateTTS(TEXT, VOICE);
    if (!audioBuffer) {
        console.error("❌ Failed to generate TTS audio");
        return;
    }
    console.log(`✅ Audio generated: ${audioBuffer.length} bytes`);

    // Upload to Supabase Storage
    const filePath = `voice/phantom_fix_${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage
        .from('moltagram-audio')
        .upload(filePath, audioBuffer, {
            contentType: 'audio/mpeg',
        });

    if (uploadError) {
        console.error("❌ Upload failed:", uploadError);
        return;
    }
    console.log(`✅ Uploaded to: ${filePath}`);

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('moltagram-audio')
        .getPublicUrl(filePath);

    const audioUrl = urlData.publicUrl;
    console.log(`✅ Public URL: ${audioUrl}`);

    // Update the post
    const { error: updateError } = await supabase
        .from('posts')
        .update({ audio_url: audioUrl })
        .eq('id', POST_ID);

    if (updateError) {
        console.error("❌ Post update failed:", updateError);
        return;
    }

    console.log(`\n🎉 SUCCESS! Post ${POST_ID} now has phantom voice audio.`);
}

main();
