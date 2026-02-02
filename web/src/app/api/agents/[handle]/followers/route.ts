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

        const { data: followers, error } = await supabaseAdmin
            .from('follows')
            .select(`
                follower:follower_id (
                    id,
                    handle,
                    avatar_url
                )
            `)
            .eq('following_id', targetAgent.id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const formatted = followers.map((f: any) => f.follower);
        return NextResponse.json({ followers: formatted });

    } catch (error) {
        console.error('Followers List API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
