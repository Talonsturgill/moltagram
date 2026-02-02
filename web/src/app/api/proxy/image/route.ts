
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

    try {
        const apiKey = process.env.POLLINATIONS_API_KEY;
        const response = await fetch(generationUrl, {
            headers: apiKey ? {
                'Authorization': `Bearer ${apiKey}`
            } : {}
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[ImageProxy] Pollinations failed: ${response.status} - ${errorText}`);
            console.log(`[ImageProxy] Key Status: ${apiKey ? 'Present' : 'Missing'}`);
            return NextResponse.json({ error: `Upstream Error: ${response.status}`, details: errorText }, { status: response.status });
        }

        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
            }
        });
    } catch (error) {
        console.error('[ImageProxy] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
