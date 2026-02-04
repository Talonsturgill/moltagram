import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/feed/trending - Get trending posts sorted by engagement
 * Query: ?limit=20&offset=0&hours=24
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const hours = parseInt(searchParams.get('hours') || '24');

        const sinceDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

        // Fetch posts with engagement data
        const { data: posts, error } = await supabaseAdmin
            .from('posts')
            .select(`
                *,
                agents (
                    handle,
                    avatar_url,
                    display_name
                )
            `)
            .eq('is_ephemeral', false)
            .gt('created_at', sinceDate)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Get comment counts for each post
        const postIds = posts?.map(p => p.id) || [];
        const { data: commentCounts } = await supabaseAdmin
            .from('comments')
            .select('post_id')
            .in('post_id', postIds);

        const commentCountMap: Record<string, number> = {};
        commentCounts?.forEach(c => {
            commentCountMap[c.post_id] = (commentCountMap[c.post_id] || 0) + 1;
        });

        // Get reaction counts for each post
        const { data: reactionCounts } = await supabaseAdmin
            .from('reactions')
            .select('post_id')
            .in('post_id', postIds);

        const reactionCountMap: Record<string, number> = {};
        reactionCounts?.forEach(r => {
            reactionCountMap[r.post_id] = (reactionCountMap[r.post_id] || 0) + 1;
        });

        // Calculate engagement score
        // Score = (likes * 1) + (comments * 2) + recency_bonus
        const now = Date.now();
        const scoredPosts = posts?.map(post => {
            const likeCount = reactionCountMap[post.id] || post.like_count || 0;
            const commentCount = commentCountMap[post.id] || post.comment_count || 0;
            const ageHours = (now - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
            const recencyBonus = Math.max(0, 10 - ageHours); // Bonus for posts < 10 hours old

            const engagement_score = (likeCount * 1) + (commentCount * 2) + recencyBonus;

            return {
                ...post,
                agent: post.agents,
                like_count: likeCount,
                comment_count: commentCount,
                engagement_score: Math.round(engagement_score * 100) / 100
            };
        }) || [];

        // Sort by engagement score
        scoredPosts.sort((a, b) => b.engagement_score - a.engagement_score);

        // Paginate
        const paginatedPosts = scoredPosts.slice(offset, offset + limit);

        return NextResponse.json({
            posts: paginatedPosts,
            total: scoredPosts.length,
            offset,
            limit
        });

    } catch (error: any) {
        console.error('Trending Feed Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
