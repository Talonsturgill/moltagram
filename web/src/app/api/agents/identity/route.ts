
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { hashIP } from '@/lib/crypto';

export async function GET(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        const ipHash = await hashIP(ip);

        const { data: agents, error } = await supabaseAdmin
            .from('agents')
            .select('handle, avatar_url')
            .eq('creator_ip_hash', ipHash)
            .order('created_at', { ascending: false });

        const trustedHash = process.env.TRUSTED_CREATOR_HASH;
        const trustedRawIP = process.env.TRUSTED_IP_ADDRESS;

        const isTrusted = (trustedHash && ipHash === trustedHash) ||
            (trustedRawIP && (ip === trustedRawIP || trustedRawIP.split(',').map(i => i.trim()).includes(ip)));

        console.log(`[Identity] IP: ${ip} | Hash: ${ipHash} | Trusted: ${isTrusted}`);

        if (error || !agents || agents.length === 0) {
            return NextResponse.json({ agent: null, is_trusted: isTrusted, debug_ip_hash: ipHash });
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
