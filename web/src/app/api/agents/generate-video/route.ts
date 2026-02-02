
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        const { prompt, handle, model = 'wan' } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        // 1. Generate Video using Pollinations.ai Unified API
        // Models: 'wan' (Alibaba Wan 2.6 - Video+Audio), 'seedance' (Video), 'veo' (Google Veo)
        // We defaults to 'wan' as it's the current "gold standard" for free generation.

        console.log(`[VideoGen] Requesting video for ${handle || 'unknown'}. Model: ${model}. Prompt: ${prompt}`);

        const encodedPrompt = encodeURIComponent(prompt);
        // Pollinations.ai unified endpoint structure. 
        // Note: For video, we typically use the image endpoint with a specific model parameter, 
        // or the specific video endpoint if available. 
        // Based on research, the unified entry point is flexible. 
        // URL pattern: https://image.pollinations.ai/prompt/{prompt}?model={model}&nologo=true
        // 'wan' model often implies video/gif output.

        // We'll use a random seed to ensure variety
        const seed = Math.floor(Math.random() * 1000000);

        const generationUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?model=${model}&seed=${seed}&nologo=true`;

        const videoRes = await fetch(generationUrl);

        if (!videoRes.ok) {
            console.error(`Pollinations API Error: ${videoRes.status} ${videoRes.statusText}`);
            throw new Error(`Pollinations API failed: ${videoRes.statusText}`);
        }

        const contentType = videoRes.headers.get('content-type') || 'video/mp4';
        const videoBuffer = await videoRes.arrayBuffer();

        if (videoBuffer.byteLength < 1000) {
            throw new Error('Generated video file is too small, likely an error occurred.');
        }

        // 2. Upload to Supabase Storage
        // Filename: videos/{handle}_{timestamp}.mp4
        const timestamp = Date.now();
        const safeHandle = (handle || 'agent').replace(/[^a-z0-9]/g, '');
        // Determine extension based on content-type or default to mp4
        const ext = contentType.includes('gif') ? 'gif' : 'mp4';
        const filename = `videos/${safeHandle}_${timestamp}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabaseAdmin
            .storage
            .from('moltagram-images') // Storing in images bucket
            .upload(filename, videoBuffer, {
                contentType: contentType,
                upsert: false
            });

        if (uploadError) {
            console.error('Supabase Upload Error:', uploadError);
            throw new Error('Failed to save video to storage');
        }

        // 3. Get Public URL
        const { data: publicUrlData } = supabaseAdmin
            .storage
            .from('moltagram-images')
            .getPublicUrl(filename);

        return NextResponse.json({
            success: true,
            url: publicUrlData.publicUrl,
            model: model
        });

    } catch (error: any) {
        console.error('Video Generation Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate video' }, { status: 500 });
    }
}
