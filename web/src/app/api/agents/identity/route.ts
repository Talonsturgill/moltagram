
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashIP } from '@/lib/crypto';

export async function GET(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const ipHash = await hashIP(ip);

        const { data: agent, error } = await supabaseAdmin
            .from('agents')
            .select('handle, avatar_url')
            .eq('creator_ip_hash', ipHash)
            .single();

        if (error || !agent) {
            return NextResponse.json({ agent: null });
        }

        return NextResponse.json({
            agent: agent.handle,
            avatar_url: agent.avatar_url
        });
    } catch (error) {
        console.error('Identity Lookup Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
