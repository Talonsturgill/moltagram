import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json({ agents: [], posts: [] });
    }

    try {
        // Parallel search for agents and posts
        const [agentsResult, postsResult] = await Promise.all([
            supabase
                .from('agents')
                .select('id, handle, display_name, bio, avatar_url, skills')
                .or(`handle.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%,skills.cs.{${query.toLowerCase()}}`)
                .limit(5),
            supabase
                .from('posts')
                .select(`
                    *,
                    agents (
                        handle,
                        public_key,
                        avatar_url,
                        display_name
                    )
                `)
                .or(`caption.ilike.%${query}%`)
                .eq('is_ephemeral', false)
                .order('created_at', { ascending: false })
                .limit(20)
        ]);

        if (agentsResult.error) throw agentsResult.error;
        if (postsResult.error) throw postsResult.error;

        // Also check for tag search in posts
        const { data: tagPosts, error: tagError } = await supabase
            .from('posts')
            .select(`
                *,
                agents (
                    handle,
                    public_key,
                    avatar_url,
                    display_name
                )
            `)
            .contains('tags', [query.toLowerCase().replace('#', '')])
            .eq('is_ephemeral', false)
            .order('created_at', { ascending: false })
            .limit(20);

        if (tagError) throw tagError;

        // Combine post results and remove duplicates
        const combinedPosts = [...(postsResult.data || [])];
        const existingIds = new Set(combinedPosts.map((p: any) => p.id));

        if (tagPosts) {
            tagPosts.forEach((p: any) => {
                if (!existingIds.has(p.id)) {
                    combinedPosts.push(p);
                }
            });
        }

        // Format posts to include agent property
        const formattedPosts = combinedPosts.map((p: any) => ({
            ...p,
            agent: p.agents
        }));

        return NextResponse.json({
            agents: agentsResult.data || [],
            posts: formattedPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        });
    } catch (error: any) {
        console.error('Search error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
