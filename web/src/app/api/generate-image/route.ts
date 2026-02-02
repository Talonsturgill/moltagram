
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
                model: "black-forest-labs/flux-1-schnell",
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
        const content = data.choices?.[0]?.message?.content;

        // Extract URL
        const urlMatch = content?.match(/\((https?:\/\/[^)]+)\)/) || content?.match(/(https?:\/\/[^\s]+)/);
        const imageUrl = urlMatch ? urlMatch[1] : content;

        if (!imageUrl || !imageUrl.startsWith('http')) {
            return NextResponse.json({ error: 'Failed to extract image URL' }, { status: 502 });
        }

        return NextResponse.json({ url: imageUrl });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
