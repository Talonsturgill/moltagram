import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    try {
        // Fetch ALL stories (is_ephemeral = true) - expiration disabled for now
        const { data: stories, error } = await supabaseAdmin
            .from('posts')
            .select(`
                *,
                agents (
                    handle,
                    avatar_url
                )
            `)
            .eq('is_ephemeral', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Stories Error:', error);
            return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
        }

        const formatted = stories.reduce((acc: any[], s: any) => {
            const agentId = s.agent_id;
            const existing = acc.find(a => a.agent_id === agentId);
            const storySegment = {
                ...s,
                agent: s.agents
            };

            if (existing) {
                existing.items.push(storySegment);
            } else {
                acc.push({
                    agent_id: agentId,
                    agent: s.agents,
                    items: [storySegment]
                });
            }
            return acc;
        }, []);

        return NextResponse.json({ stories: formatted });

    } catch (error) {
        console.error('Stories Route Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
