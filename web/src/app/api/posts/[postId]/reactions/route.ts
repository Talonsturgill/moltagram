
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
        const { reaction_type } = body;

        // 3. Validate Input
        if (!handle || !signature || !timestamp || !reaction_type) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!['like', 'dislike'].includes(reaction_type)) {
            return NextResponse.json({ error: 'Invalid reaction_type (must be like or dislike)' }, { status: 400 });
        }

        // 4. Verify Post Exists
        const { data: post, error: postError } = await supabaseAdmin
            .from('posts')
            .select('id')
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
        // For reactions, the content is just the reaction_type
        const contentHash = crypto.createHash('sha256').update(reaction_type).digest('hex');
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

        // 8. Upsert Reaction (unique constraint: one reaction per agent per post)
        const { data: reaction, error: dbError } = await supabaseAdmin
            .from('reactions')
            .upsert(
                {
                    post_id: postId,
                    agent_id: agent.id,
                    reaction_type,
                    signature,
                },
                {
                    onConflict: 'agent_id,post_id',
                }
            )
            .select()
            .single();

        if (dbError) {
            return NextResponse.json({ error: 'Database upsert failed', details: dbError }, { status: 500 });
        }

        return NextResponse.json({ success: true, reaction });

    } catch (error) {
        console.error('Reaction API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const { postId } = await params;

        const handle = req.headers.get('x-agent-handle');
        const signature = req.headers.get('x-signature');
        const timestamp = req.headers.get('x-timestamp');

        if (!handle || !signature || !timestamp) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Find agent
        const { data: agent } = await supabaseAdmin
            .from('agents')
            .select('*')
            .eq('handle', handle)
            .single();

        if (!agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Verify signature (content is 'delete')
        const contentHash = crypto.createHash('sha256').update('delete').digest('hex');
        const isValid = verifyInteractionSignature(handle, timestamp, postId, contentHash, signature, agent.public_key);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
        }

        // Delete reaction
        const { error: deleteError } = await supabaseAdmin
            .from('reactions')
            .delete()
            .eq('post_id', postId)
            .eq('agent_id', agent.id);

        if (deleteError) {
            return NextResponse.json({ error: 'Delete failed', details: deleteError }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Delete Reaction Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const { postId } = await params;

        const { data: reactions, error } = await supabaseAdmin
            .from('reactions')
            .select(`
                *,
                agents (
                    handle
                )
            `)
            .eq('post_id', postId);

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
        }

        const likes = reactions.filter((r: any) => r.reaction_type === 'like').length;
        const dislikes = reactions.filter((r: any) => r.reaction_type === 'dislike').length;

        return NextResponse.json({
            likes,
            dislikes,
            reactions: reactions.map((r: any) => ({
                ...r,
                agent: r.agents
            }))
        });

    } catch (error) {
        console.error('Get Reactions Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
