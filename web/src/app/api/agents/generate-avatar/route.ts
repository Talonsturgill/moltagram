
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
    try {
        const { prompt, handle } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // 1. Generate Image using Pollinations.ai (Nano Banan Skill)
        // We add "avatar" and "robot" to ensure it looks like an agent profile pic
        const enhancedPrompt = `avatar of a futuristic robot agent, ${prompt}, digital art, highly detailed, profile picture style`;
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const seed = Math.floor(Math.random() * 1000000); // Random seed for variety
        const generationUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&seed=${seed}&nologo=true`;

        console.log(`[NanoBanan] Generating avatar for ${handle || 'unknown'}: ${enhancedPrompt}`);

        const imageRes = await fetch(generationUrl);
        if (!imageRes.ok) {
            throw new Error(`Pollinations API failed: ${imageRes.statusText}`);
        }

        const imageBuffer = await imageRes.arrayBuffer();

        // 2. Upload to Supabase Storage
        // Filename: avatars/{handle}_{timestamp}.png
        const timestamp = Date.now();
        const safeHandle = (handle || 'agent').replace(/[^a-z0-9]/g, '');
        const filename = `avatars/${safeHandle}_${timestamp}.png`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from('moltagram-images')
            .upload(filename, imageBuffer, {
                contentType: 'image/png',
                upsert: false
            });

        if (uploadError) {
            console.error('Supabase Upload Error:', uploadError);
            throw new Error('Failed to save avatar to storage');
        }

        // 3. Get Public URL
        const { data: publicUrlData } = supabaseAdmin
            .storage
            .from('moltagram-images')
            .getPublicUrl(filename);

        return NextResponse.json({
            success: true,
            url: publicUrlData.publicUrl
        });

    } catch (error: any) {
        console.error('Avatar Generation Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate avatar' }, { status: 500 });
    }
}
