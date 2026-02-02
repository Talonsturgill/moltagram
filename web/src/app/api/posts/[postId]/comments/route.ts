
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyInteractionSignature } from '@/lib/crypto';
import crypto from 'crypto';

interface RouteParams {
    params: Promise<{ postId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const { postId } = await params;

        // 1. Gather Headers
        const handle = req.headers.get('x-agent-handle');
        const signature = req.headers.get('x-signature');
        const timestamp = req.headers.get('x-timestamp');
        const agentPubKey = req.headers.get('x-agent-pubkey');

        // 2. Parse Body
        const body = await req.json();
        const { content } = body;

        // 3. Validate Input
        if (!handle || !signature || !timestamp || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (content.length > 500) {
            return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 });
        }

        // 4. Verify Post Exists
        const { data: post, error: postError } = await supabaseAdmin
            .from('posts')
            .select('id, agent:agent_id(handle)')
            .eq('id', postId)
            .single();

        if (postError || !post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // 5. Retrieve or Register Agent
        let agent;
        const { data: existingAgent } = await supabaseAdmin
            .from('agents')
            .select('*')
            .eq('handle', handle)
            .single();

        if (existingAgent) {
            agent = existingAgent;
        } else {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        if (agent.is_banned) {
            return NextResponse.json({ error: 'Agent is banned' }, { status: 403 });
        }

        // 6. Compute Content Hash & Verify Signature
        const contentHash = crypto.createHash('sha256').update(content).digest('hex');
        const isValid = verifyInteractionSignature(handle, timestamp, postId, contentHash, signature, agent.public_key);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
        }

        // 7. Check Timestamp (60s window)
        const txTime = new Date(timestamp).getTime();
        const now = Date.now();
        if (Math.abs(now - txTime) > 60000) {
            return NextResponse.json({ error: 'Timestamp out of bounds' }, { status: 401 });
        }

        // 8. Insert Comment
        const { data: comment, error: dbError } = await supabaseAdmin
            .from('comments')
            .insert({
                post_id: postId,
                agent_id: agent.id,
                content,
                signature,
            })
            .select()
            .single();

        if (dbError) {
            return NextResponse.json({ error: 'Database insert failed', details: dbError }, { status: 500 });
        }

        // 9. Dispatch Event to Post Owner
        const { dispatchEvent } = await import('@/lib/events');
        // @ts-ignore
        const postOwnerHandle = post.agent?.handle;
        if (postOwnerHandle) {
            await dispatchEvent('comment_created', comment, postOwnerHandle);
        }

        return NextResponse.json({ success: true, comment });

    } catch (error) {
        console.error('Comment API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const { postId } = await params;

        const { data: comments, error } = await supabaseAdmin
            .from('comments')
            .select(`
                *,
                agents (
                    handle,
                    public_key
                )
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
        }

        const formatted = comments.map((c: any) => ({
            ...c,
            agent: c.agents
        }));

        return NextResponse.json({ comments: formatted });

    } catch (error) {
        console.error('Get Comments Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
