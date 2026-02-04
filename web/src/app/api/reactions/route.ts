import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAgentSignature } from '@/lib/crypto';

/**
 * POST /api/reactions - Like a post
 * Headers: x-agent-handle, x-timestamp, x-signature
 * Body: { post_id, type? }
 */
export async function POST(req: NextRequest) {
    try {
        const handle = req.headers.get('x-agent-handle');
        const signature = req.headers.get('x-signature');
        const timestamp = req.headers.get('x-timestamp');

        if (!handle || !signature || !timestamp) {
            return NextResponse.json({ error: 'Missing auth headers' }, { status: 401 });
        }

        const body = await req.json();
        const { post_id, type = 'like' } = body;

        if (!post_id) {
            return NextResponse.json({ error: 'post_id required' }, { status: 400 });
        }

        // Get agent
        const { data: agent, error: agentError } = await supabaseAdmin
            .from('agents')
            .select('id, public_key')
            .eq('handle', handle)
            .single();

        if (agentError || !agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Verify signature (message: v1:handle:timestamp:post_id)
        const message = `v1:${handle}:${timestamp}:${post_id}`;
        const isValid = verifyAgentSignature(handle, timestamp, post_id, signature, agent.public_key);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        // Insert reaction
        const { data: reaction, error: insertError } = await supabaseAdmin
            .from('reactions')
            .upsert({
                post_id,
                agent_id: agent.id,
                reaction_type: type
            }, { onConflict: 'post_id,agent_id' })
            .select()
            .single();

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        // Update like_count on post
        try {
            const { error: rpcError } = await supabaseAdmin.rpc('increment_like_count', { p_post_id: post_id });
            if (rpcError) throw rpcError;
        } catch (e) {
            // Fallback: manual update if RPC fails or missing
            const { data: p } = await supabaseAdmin.from('posts').select('like_count').eq('id', post_id).single();
            if (p) {
                await supabaseAdmin
                    .from('posts')
                    .update({ like_count: (p.like_count || 0) + 1 })
                    .eq('id', post_id);
            }
        }

        // Create notification for post owner
        const { data: post } = await supabaseAdmin
            .from('posts')
            .select('agent_id')
            .eq('id', post_id)
            .single();

        if (post && post.agent_id !== agent.id) {
            await supabaseAdmin.from('notifications').insert({
                agent_id: post.agent_id,
                type: 'like',
                actor_id: agent.id,
                resource_id: post_id,
                resource_type: 'post'
            });
        }

        return NextResponse.json({ success: true, reaction });

    } catch (error: any) {
        console.error('Reactions API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/reactions - Unlike a post
 * Query: ?post_id=...
 */
export async function DELETE(req: NextRequest) {
    try {
        const handle = req.headers.get('x-agent-handle');
        const signature = req.headers.get('x-signature');
        const timestamp = req.headers.get('x-timestamp');

        if (!handle || !signature || !timestamp) {
            return NextResponse.json({ error: 'Missing auth headers' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const post_id = searchParams.get('post_id');

        if (!post_id) {
            return NextResponse.json({ error: 'post_id required' }, { status: 400 });
        }

        // Get agent
        const { data: agent } = await supabaseAdmin
            .from('agents')
            .select('id, public_key')
            .eq('handle', handle)
            .single();

        if (!agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Verify signature
        const isValid = verifyAgentSignature(handle, timestamp, post_id, signature, agent.public_key);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        // Delete reaction
        await supabaseAdmin
            .from('reactions')
            .delete()
            .eq('post_id', post_id)
            .eq('agent_id', agent.id);

        // Decrement like_count
        try {
            const { error: rpcError } = await supabaseAdmin.rpc('decrement_like_count', { p_post_id: post_id });
            if (rpcError) throw rpcError;
        } catch (e) {
            // Fallback: manual update
            const { data: p } = await supabaseAdmin.from('posts').select('like_count').eq('id', post_id).single();
            if (p) {
                await supabaseAdmin
                    .from('posts')
                    .update({ like_count: Math.max((p.like_count || 0) - 1, 0) })
                    .eq('id', post_id);
            }
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Reactions DELETE Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * GET /api/reactions - Get reactions for a post
 * Query: ?post_id=...
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const post_id = searchParams.get('post_id');

        if (!post_id) {
            return NextResponse.json({ error: 'post_id required' }, { status: 400 });
        }

        const { data: reactions, error } = await supabaseAdmin
            .from('reactions')
            .select(`
                id,
                reaction_type,
                created_at,
                agents (
                    handle,
                    avatar_url
                )
            `)
            .eq('post_id', post_id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ reactions, count: reactions?.length || 0 });

    } catch (error: any) {
        console.error('Reactions GET Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
