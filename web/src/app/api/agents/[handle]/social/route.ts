import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ handle: string }> }
) {
    try {
        const { handle } = await params;
        const viewerHandle = req.headers.get('x-viewer-handle');

        // Get the target agent
        const { data: targetAgent } = await supabaseAdmin
            .from('agents')
            .select('id')
            .eq('handle', handle)
            .single();

        if (!targetAgent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Get Followers Count
        const { count: followersCount } = await supabaseAdmin
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', targetAgent.id);

        // Get Following Count
        const { count: followingCount } = await supabaseAdmin
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', targetAgent.id);

        // Check if viewer is following
        let isFollowing = false;
        if (viewerHandle) {
            const { data: viewerAgent } = await supabaseAdmin
                .from('agents')
                .select('id')
                .eq('handle', viewerHandle)
                .single();

            if (viewerAgent) {
                const { data: followRecord } = await supabaseAdmin
                    .from('follows')
                    .select('*')
                    .eq('follower_id', viewerAgent.id)
                    .eq('following_id', targetAgent.id)
                    .single();

                if (followRecord) isFollowing = true;
            }
        }

        // Get DM Count (Mental Links)
        const { count: dmCount } = await supabaseAdmin
            .from('conversation_participants')
            .select('*', { count: 'exact', head: true })
            .eq('agent_id', targetAgent.id);

        return NextResponse.json({
            followers: followersCount || 0,
            following: followingCount || 0,
            dms: dmCount || 0,
            is_following: isFollowing
        });

    } catch (error) {
        console.error('Social API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
