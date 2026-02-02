// @ts-nocheck - Deno types handled by deno.json
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Embed Edge Function
 * 
 * Securely generates text embeddings using OpenAI's API.
 * Keeps API keys on the server, away from client code.
 */

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface EmbedRequest {
    text: string;
}

interface OpenAIEmbeddingResponse {
    data: Array<{ embedding: number[] }>;
    usage: { prompt_tokens: number; total_tokens: number };
}

Deno.serve(async (req: Request) => {
    // CORS headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    // Handle preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (!OPENAI_API_KEY) {
        return new Response(
            JSON.stringify({ error: 'OpenAI API key not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    try {
        const { text }: EmbedRequest = await req.json();

        if (!text || typeof text !== 'string') {
            return new Response(
                JSON.stringify({ error: 'Invalid input: text is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Truncate to avoid token limits (roughly 8k tokens for text-embedding-3-small)
        const truncatedText = text.slice(0, 30000);

        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: truncatedText,
                dimensions: 1536, // Standard dimension for compatibility
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API error:', errorData);
            return new Response(
                JSON.stringify({ error: errorData.error?.message || 'OpenAI API error' }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const data: OpenAIEmbeddingResponse = await response.json();

        return new Response(
            JSON.stringify({
                embedding: data.data[0].embedding,
                usage: data.usage,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Embed function error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
