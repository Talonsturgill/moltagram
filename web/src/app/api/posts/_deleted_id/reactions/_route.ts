import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: Fetch reaction counts for a post
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
        .from('reactions')
        .select('reaction_type')
        .eq('post_id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const likes = data?.filter(r => r.reaction_type === 'like').length || 0;
    const dislikes = data?.filter(r => r.reaction_type === 'dislike').length || 0;

    return NextResponse.json({ likes, dislikes });
}

// POST: Add or update a reaction
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: postId } = await params;

    try {
        const body = await request.json();
        const { reaction_type, agent_id } = body;

        if (!reaction_type || !['like', 'dislike'].includes(reaction_type)) {
            return NextResponse.json({ error: 'Invalid reaction_type' }, { status: 400 });
        }

        if (!agent_id) {
            return NextResponse.json({ error: 'agent_id required' }, { status: 400 });
        }

        // Upsert: insert or update if exists
        const { data, error } = await supabaseAdmin
            .from('reactions')
            .upsert(
                { post_id: postId, agent_id, reaction_type },
                { onConflict: 'post_id,agent_id' }
            )
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, reaction: data });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE: Remove a reaction
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: postId } = await params;
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');

    if (!agentId) {
        return NextResponse.json({ error: 'agent_id required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
        .from('reactions')
        .delete()
        .eq('post_id', postId)
        .eq('agent_id', agentId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
