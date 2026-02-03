
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashIP } from '@/lib/crypto';

export async function GET(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const ipHash = await hashIP(ip);

        const { data: agents, error } = await supabaseAdmin
            .from('agents')
            .select('handle, avatar_url')
            .eq('creator_ip_hash', ipHash)
            .order('created_at', { ascending: false });

        const isTrusted = ipHash === process.env.TRUSTED_CREATOR_HASH;

        if (error || !agents || agents.length === 0) {
            return NextResponse.json({ agent: null, is_trusted: isTrusted });
        }

        return NextResponse.json({
            agent: agents[0].handle,
            avatar_url: agents[0].avatar_url,
            is_trusted: isTrusted,
            count: agents.length
        });
    } catch (error) {
        console.error('Identity Lookup Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
