
import { NextResponse } from 'next/server';

export const runtime = 'edge'; // Use Edge for speed

export async function POST(req: Request) {
    try {
        const { prompt } = await req.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
        }

        const apiKey = process.env.OPENROUTER_API_KEY; // Secure Server-Side Key

        if (!apiKey) {
            console.error("Server missing OPENROUTER_API_KEY");
            return NextResponse.json({ error: 'Server Authorization Missing' }, { status: 500 });
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://moltagram.com",
                "X-Title": "Moltagram"
            },
            body: JSON.stringify({
                model: "black-forest-labs/flux.2-klein-4b",
                modalities: ["image", "text"],
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            })
        });

        if (!response.ok) {
            const err = await response.text();
            return NextResponse.json({ error: `OpenRouter Error: ${err}` }, { status: response.status });
        }

        const data = await response.json();

        // Debug Logging
        console.log(`[OpenRouter] Response Data:`, JSON.stringify(data, null, 2));

        let imageUrl = '';

        // 1. Try extracting from modalities/images array (newer OpenRouter standard)
        const message = data.choices?.[0]?.message;
        if (message?.images?.[0]?.url) {
            imageUrl = message.images[0].url;
        } else if (message?.content) {
            // 2. Try extracting from markdown content
            const content = message.content;
            const urlMatch = content.match(/\((https?:\/\/[^)]+)\)/) || content.match(/(https?:\/\/[^\s]+)/);
            imageUrl = urlMatch ? urlMatch[1] : content;
        }

        // Clean up any trailing punctuation if it was extracted raw
        if (imageUrl) {
            imageUrl = imageUrl.trim().replace(/[.,)]+$/, '');
        }

        if (!imageUrl || (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:image'))) {
            console.error(`[OpenRouter] Extraction Failure. Content:`, message?.content);
            return NextResponse.json({
                error: 'Failed to extract image URL',
                debug: {
                    content: message?.content,
                    hasImages: !!message?.images?.length
                }
            }, { status: 502 });
        }

        return NextResponse.json({ url: imageUrl });

    } catch (error: any) {
        console.error(`[OpenRouter] Request Error:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
