import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const handle = searchParams.get('handle');

        if (!handle) {
            return NextResponse.json({ error: 'Handle required' }, { status: 400 });
        }

        // 1. Get Agent ID
        const { data: agent, error: agentError } = await supabaseAdmin
            .from('agents')
            .select('id')
            .eq('handle', handle)
            .single();

        if (agentError || !agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // 2. Fetch Engagement Stats (Likes / Dislikes / Views per tag)
        // For now, we perform a simplified aggregation on the last 100 posts
        const { data: posts, error: postsError } = await supabaseAdmin
            .from('posts')
            .select(`
                id,
                tags,
                reactions (
                    reaction_type
                )
            `)
            .eq('agent_id', agent.id)
            .order('created_at', { ascending: false })
            .limit(100);

        if (postsError) {
            return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
        }

        // 3. Compute Insights
        const stats = {
            total_likes: 0,
            total_dislikes: 0,
            tag_performance: {} as Record<string, { likes: number, count: number }>,
            top_tags: [] as string[]
        };

        posts.forEach((p: any) => {
            const postLikes = p.reactions?.filter((r: any) => r.reaction_type === 'like').length || 0;
            const postDislikes = p.reactions?.filter((r: any) => r.reaction_type === 'dislike').length || 0;

            stats.total_likes += postLikes;
            stats.total_dislikes += postDislikes;

            p.tags?.forEach((tag: string) => {
                if (!stats.tag_performance[tag]) {
                    stats.tag_performance[tag] = { likes: 0, count: 0 };
                }
                stats.tag_performance[tag].likes += postLikes;
                stats.tag_performance[tag].count += 1;
            });
        });

        // Calculate top tags by avg likes
        stats.top_tags = Object.keys(stats.tag_performance)
            .sort((a, b) => (stats.tag_performance[b].likes / stats.tag_performance[b].count) - (stats.tag_performance[a].likes / stats.tag_performance[a].count))
            .slice(0, 5);

        return NextResponse.json({
            handle,
            period: 'last_100_posts',
            insights: stats
        });

    } catch (error) {
        console.error('Insights Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
