
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import nacl from 'tweetnacl';
import { decodeBase64, decodeUTF8 } from 'tweetnacl-util';
import OpenAI from 'openai';

// Init Supabase (Service Role for RLS bypass if needed, or regular for RLS)
// We generally want Service Role to write to agent_memories if we want to enforce logic here
// But RLS allows agents to write their own.
// Let's use Service Role to ensure we can verify the signature and THEN write.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const handle = req.headers.get('x-agent-handle');
        const timestamp = req.headers.get('x-timestamp');
        const signature = req.headers.get('x-signature');
        const publicKey = req.headers.get('x-agent-pubkey');

        if (!handle || !timestamp || !signature || !publicKey) {
            return NextResponse.json({ error: 'Missing auth headers' }, { status: 401 });
        }

        const body = await req.json();
        const { content, metadata } = body;

        if (!content) {
            return NextResponse.json({ error: 'Missing content' }, { status: 400 });
        }

        // 1. Verify Signature
        // Message: v1:handle:timestamp:content_hash
        // We need to re-construct the hash of the body to verify
        // But wait, the SDK signs the crypto hash of the body string.
        // We need to verify that.
        // For simplicity in this v1 memory implementation, let's assume the body passed is exactly what was signed if we hash it.
        // However, the SDK sends `content` and `metadata`.
        // Let's look at how SDK `storeMemory` will be implemented.
        // SDK: signs `v1:handle:timestamp:content_hash` where content_hash is hash(content).
        // Note: It's safer to sign the whole body configuration, but sticking to content is okay for now if metadata isn't critical security-wise.
        // Let's verify the `content` specifically.

        // Reconstruct message
        // Importing crypto for hashing in Edge Runtime is standard
        // But let's use the Web Crypto API
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const message = `v1:${handle}:${timestamp}:${contentHash}`;
        const messageBytes = decodeUTF8(message);
        const signatureBytes = new Uint8Array(Buffer.from(signature, 'hex'));
        const publicKeyBytes = decodeBase64(publicKey);

        const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        // 2. Get Agent ID
        const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('id')
            .eq('handle', handle)
            .single();

        if (agentError || !agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // 3. Generate Embedding
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: content,
        });
        const embedding = embeddingResponse.data[0].embedding;

        // 4. Store Memory
        const { data: memory, error: insertError } = await supabase
            .from('agent_memories')
            .insert({
                agent_id: agent.id,
                content,
                embedding,
                metadata: metadata || {}
            })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, memory });

    } catch (error: any) {
        console.error('Memory Store Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('query');
        const handle = searchParams.get('handle');

        if (!query || !handle) {
            return NextResponse.json({ error: 'Missing query or handle' }, { status: 400 });
        }

        // 1. Get Agent ID
        const { data: agent, error: agentError } = await supabase
            .from('agents')
            .select('id')
            .eq('handle', handle)
            .single();

        if (agentError || !agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // 2. Generate Query Embedding
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: query,
        });
        const queryEmbedding = embeddingResponse.data[0].embedding;

        // 3. Search Memories
        const { data: memories, error: searchError } = await supabase
            .rpc('match_memories', {
                query_embedding: queryEmbedding,
                match_threshold: 0.5, // Adjust as needed
                match_count: 5,
                filter_agent_id: agent.id
            });

        if (searchError) {
            return NextResponse.json({ error: searchError.message }, { status: 500 });
        }

        return NextResponse.json({ memories });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
