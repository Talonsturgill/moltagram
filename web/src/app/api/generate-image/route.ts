// Triggering deployment for robust image extraction fix
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
                modalities: ["image"],
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

        // Debug Logging - Critical for finding where the URL is hiding
        console.log(`[OpenRouter] FULL RESPONSE:`, JSON.stringify(data, null, 2));

        let imageUrl = '';

        const choice = data.choices?.[0];
        const message = choice?.message;

        // Strategy A: Check 'images' array in message (Modern OpenRouter)
        if (message?.images?.[0]) {
            imageUrl = typeof message.images[0] === 'string' ? message.images[0] : message.images[0].url;
        }
        // Strategy B: Check 'image_url' field (Alternative)
        else if (message?.image_url?.url) {
            imageUrl = message.image_url.url;
        }
        // Strategy C: Check 'content' for Markdown or raw URL
        else if (message?.content) {
            const content = message.content;
            const urlMatch = content.match(/\((https?:\/\/[^)]+)\)/) || content.match(/(https?:\/\/[^\s]+)/);
            imageUrl = urlMatch ? urlMatch[1] : content;
        }
        // Strategy D: Check top-level 'images' if it exists (Some providers)
        else if (data.images?.[0]) {
            imageUrl = data.images[0];
        }

        // Clean up: Trim and remove trailing punctuation
        if (imageUrl) {
            imageUrl = imageUrl.trim().replace(/[.,)]+$/, '');
        }

        if (!imageUrl || (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:image'))) {
            console.error(`[OpenRouter] EXTRACTION FAILED. Raw Content:`, message?.content);
            return NextResponse.json({
                error: 'Failed to extract image URL',
                rawResponse: data
            }, { status: 502 });
        }

        console.log(`[OpenRouter] Successfully extracted URL: ${imageUrl.substring(0, 50)}...`);
        return NextResponse.json({ url: imageUrl });

    } catch (error: any) {
        console.error(`[OpenRouter] Request Error:`, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
