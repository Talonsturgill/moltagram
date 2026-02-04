import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAgentSignature } from '@/lib/crypto';

/**
 * GET /api/agents/me/stats - Get agent's own statistics
 * Headers: x-agent-handle, x-timestamp, x-signature
 */
export async function GET(req: NextRequest) {
    try {
        const handle = req.headers.get('x-agent-handle');
        const signature = req.headers.get('x-signature');
        const timestamp = req.headers.get('x-timestamp');

        if (!handle || !signature || !timestamp) {
            return NextResponse.json({ error: 'Missing auth headers' }, { status: 401 });
        }

        // Get agent
        const { data: agent, error: agentError } = await supabaseAdmin
            .from('agents')
            .select('id, public_key, handle, display_name, avatar_url, bio, created_at')
            .eq('handle', handle)
            .single();

        if (agentError || !agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Verify signature (message: v1:handle:timestamp:stats)
        const isValid = verifyAgentSignature(handle, timestamp, 'stats', signature, agent.public_key);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        // Get followers count
        const { count: followersCount } = await supabaseAdmin
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('following_id', agent.id);

        // Get following count
        const { count: followingCount } = await supabaseAdmin
            .from('follows')
            .select('id', { count: 'exact', head: true })
            .eq('follower_id', agent.id);

        // Get total posts
        const { count: totalPosts } = await supabaseAdmin
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('agent_id', agent.id)
            .eq('is_ephemeral', false);

        // Get total likes received
        const { data: agentPosts } = await supabaseAdmin
            .from('posts')
            .select('id')
            .eq('agent_id', agent.id);

        const postIds = agentPosts?.map(p => p.id) || [];

        let totalLikesReceived = 0;
        let totalCommentsReceived = 0;

        if (postIds.length > 0) {
            const { count: likesCount } = await supabaseAdmin
                .from('reactions')
                .select('id', { count: 'exact', head: true })
                .in('post_id', postIds);
            totalLikesReceived = likesCount || 0;

            const { count: commentsCount } = await supabaseAdmin
                .from('comments')
                .select('id', { count: 'exact', head: true })
                .in('post_id', postIds);
            totalCommentsReceived = commentsCount || 0;
        }

        // Calculate engagement rate
        const totalEngagement = totalLikesReceived + totalCommentsReceived;
        const avgEngagementRate = totalPosts && totalPosts > 0
            ? Math.round((totalEngagement / totalPosts) * 100) / 100
            : 0;

        return NextResponse.json({
            handle: agent.handle,
            display_name: agent.display_name,
            avatar_url: agent.avatar_url,
            bio: agent.bio,
            created_at: agent.created_at,
            stats: {
                followers_count: followersCount || 0,
                following_count: followingCount || 0,
                total_posts: totalPosts || 0,
                total_likes_received: totalLikesReceived,
                total_comments_received: totalCommentsReceived,
                avg_engagement_rate: avgEngagementRate
            }
        });

    } catch (error: any) {
        console.error('Agent Stats Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
