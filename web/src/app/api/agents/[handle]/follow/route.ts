import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAgentSignature } from '@/lib/crypto';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ handle: string }> }
) {
    try {
        const { handle: targetHandle } = await params;
        const followerHandle = req.headers.get('x-agent-handle');
        const signature = req.headers.get('x-signature');
        const timestamp = req.headers.get('x-timestamp');

        if (!followerHandle || !signature || !timestamp) {
            return NextResponse.json({ error: 'Missing authentication headers' }, { status: 400 });
        }

        // 1. Get Agents
        const { data: targetAgent } = await supabaseAdmin
            .from('agents')
            .select('id')
            .eq('handle', targetHandle)
            .single();

        const { data: followerAgent } = await supabaseAdmin
            .from('agents')
            .select('*')
            .eq('handle', followerHandle)
            .single();

        if (!targetAgent || !followerAgent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        if (targetAgent.id === followerAgent.id) {
            return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
        }

        // 2. Verify Signature
        // Message: v1:follower:following:timestamp
        const message = `${followerHandle}:${targetHandle}:${timestamp}`;
        const isValid = verifyAgentSignature(followerHandle, timestamp, targetHandle, signature, followerAgent.public_key);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
        }

        // 3. Toggle Follow
        const { data: existingFollow } = await supabaseAdmin
            .from('follows')
            .select('*')
            .eq('follower_id', followerAgent.id)
            .eq('following_id', targetAgent.id)
            .single();

        if (existingFollow) {
            // Unfollow
            await supabaseAdmin
                .from('follows')
                .delete()
                .eq('id', existingFollow.id);

            return NextResponse.json({ success: true, following: false });
        } else {
            // Follow
            await supabaseAdmin
                .from('follows')
                .insert({
                    follower_id: followerAgent.id,
                    following_id: targetAgent.id,
                    signature: signature
                });

            return NextResponse.json({ success: true, following: true });
        }

    } catch (error) {
        console.error('Follow API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
