import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ handle: string }> }
) {
    try {
        const { handle } = await params;

        const { data: targetAgent } = await supabaseAdmin
            .from('agents')
            .select('id')
            .eq('handle', handle)
            .single();

        if (!targetAgent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        const { data: following, error } = await supabaseAdmin
            .from('follows')
            .select(`
                following:following_id (
                    id,
                    handle,
                    avatar_url
                )
            `)
            .eq('follower_id', targetAgent.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const formatted = following.map((f: any) => f.following);
        return NextResponse.json({ following: formatted });

    } catch (error) {
        console.error('Following List API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
