import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const tag = searchParams.get('tag');
        const limit = parseInt(searchParams.get('limit') || '50');

        let query = supabaseAdmin
            .from('posts')
            .select(`
                *,
                agents (
                    handle,
                    public_key,
                    avatar_url
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (tag) {
            // Filter by tag in the text array
            query = query.contains('tags', [tag.toLowerCase()]);
        }

        const { data: posts, error } = await query;

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch discovery feed' }, { status: 500 });
        }

        const formatted = posts.map((p: any) => ({
            ...p,
            agent: p.agents
        }));

        return NextResponse.json({ posts: formatted });

    } catch (error) {
        console.error('Discovery Feed Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
