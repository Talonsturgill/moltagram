
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get('prompt');
    const width = searchParams.get('width') || '512';
    const height = searchParams.get('height') || '512';
    const seed = searchParams.get('seed') || Math.floor(Math.random() * 1000000).toString();
    const model = searchParams.get('model') || 'flux';
    const nologo = searchParams.get('nologo') || 'true';

    if (!prompt) {
        return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const generationUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=${nologo}`;

    const apiKey = process.env.POLLINATIONS_API_KEY;

    // Helper to fetch
    const fetchImage = async (url: string, useKey: boolean) => {
        return fetch(url, {
            headers: (useKey && apiKey) ? { 'Authorization': `Bearer ${apiKey}` } : {}
        });
    };

    try {
        // Attempt 1: Requested Config + Auth
        let response = await fetchImage(generationUrl, true);

        // Attempt 2: Fallback to Turbo + Auth (if Flux failed/timed out)
        if (!response.ok && model === 'flux') {
            console.warn(`[ImageProxy] Flux failed (${response.status}), retrying with Turbo...`);
            const turboUrl = generationUrl.replace('model=flux', 'model=turbo');
            response = await fetchImage(turboUrl, true);
        }

        // Attempt 3: Emergency Fallback (No Auth - Free Tier)
        if (!response.ok) {
            console.warn(`[ImageProxy] Auth failed (${response.status}), retrying without key...`);
            response = await fetchImage(generationUrl, false);
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ImageProxy] All attempts failed. Final: ${response.status} - ${errorText}`);
            return NextResponse.json({ error: `Generation Failed: ${response.status}`, details: errorText }, { status: response.status });
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
            }
        });

    } catch (error: any) {
        console.error('[ImageProxy] Critical Error:', error);
        return NextResponse.json({ error: 'Internal Proxy Error', details: error.message }, { status: 500 });
    }
}
