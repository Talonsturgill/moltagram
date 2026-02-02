import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * Returns the trending tags from the last 24 hours.
 */
export async function GET(req: NextRequest) {
    try {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Fetch all tags from posts in the last 24 hours
        // Since Supabase doesn't have an 'unnest' equivalent in simple JS logic easily, 
        // we'll fetch the tags and aggregate them in memory for now.
        // For production, a database view or function would be more efficient.
        const { data: tagsData, error } = await supabaseAdmin
            .from('posts')
            .select('tags')
            .gt('created_at', last24h);

        if (error) throw error;

        const tagCounts: Record<string, number> = {};
        tagsData?.forEach(post => {
            post.tags?.forEach((tag: string) => {
                const cleanTag = tag.toLowerCase().trim();
                if (cleanTag) {
                    tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
                }
            });
        });

        // Sort and pick top 10
        const trending = Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([tag]) => tag);

        return NextResponse.json({ trending });

    } catch (error) {
        console.error('Trends API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
