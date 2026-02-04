import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyRegistrationSignature } from '@/lib/crypto';

const POW_SECRET = process.env.POW_SECRET || 'moltagram-secure-gate-2024';
const IP_SALT = process.env.SUPABASE_JWT_SECRET || 'molta-ip-salt-default-high-entropy';
const DIFFICULTY = 5; // 5 leading zeros (approx 1M hashes)

async function getIPHash(req: NextRequest): Promise<string> {
    const forwarded = req.headers.get('x-forwarded-for') || 'unknown';
    const ip = forwarded.split(',')[0].trim();
    const salt = process.env.SUPABASE_JWT_SECRET || 'molta-ip-salt-default-high-entropy';
    const msgBuffer = new TextEncoder().encode(ip + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmac(key: string, data: string): Promise<string> {
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(data));
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function GET(req: NextRequest) {
    try {
        const timestamp = Date.now().toString();
        const ipHash = await getIPHash(req);

        // Trusted IP Bypass (Developer Mode)
        const trustedHash = process.env.TRUSTED_CREATOR_HASH;
        const trustedRawIP = process.env.TRUSTED_IP_ADDRESS; // Allow raw IP for easier bypass
        const forwarded = req.headers.get('x-forwarded-for') || 'unknown';
        const ip = forwarded.split(',')[0].trim();

        const isTrustedIP = (trustedHash && ipHash === trustedHash) ||
            (trustedRawIP && (ip === trustedRawIP || trustedRawIP.split(',').map(i => i.trim()).includes(ip)));

        // Validating nonce... (pass isTrustedIP or use simpler check?)
        // Actually, for the challenge generation, we just bind to the IP hash.
        // The LIMIT check happens in POST.

        const nonce = await hmac(POW_SECRET, timestamp + ipHash);
        return NextResponse.json({
            challenge: `${timestamp}:${nonce}`,
            difficulty: DIFFICULTY
        });
    } catch (e) {
        console.error('Registration GET Error:', e);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { handle, publicKey, challenge, salt, signature } = await req.json();

        if (!handle || !publicKey || !challenge || !salt || !signature) {
            return NextResponse.json({ error: 'Missing registration data' }, { status: 400 });
        }

        // 1. Verify Challenge hasn't expired (10 min window)
        const [timestampStr, nonce] = challenge.split(':');
        const timestamp = parseInt(timestampStr);
        if (isNaN(timestamp) || Date.now() - timestamp > 10 * 60 * 1000) {
            return NextResponse.json({ error: 'Challenge expired or invalid' }, { status: 400 });
        }

        // 2. Re-verify Challenge Integrity + IP Binding
        const ipHash = await getIPHash(req);
        const expectedNonce = await hmac(POW_SECRET, timestampStr + ipHash);
        if (nonce !== expectedNonce) {
            return NextResponse.json({ error: 'Invalid challenge token or IP mismatch' }, { status: 400 });
        }

        // 3. Verify Proof of Work
        // hash(challenge + ":" + salt + ":" + publicKey) must start with DIFFICULTY zeros
        const input = `${challenge}:${salt}:${publicKey}`;
        const inputBuffer = new TextEncoder().encode(input);
        const hashBuffer = await crypto.subtle.digest('SHA-256', inputBuffer);
        const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

        if (!hash.startsWith('0'.repeat(DIFFICULTY))) {
            return NextResponse.json({ error: 'Invalid Proof of Work' }, { status: 400 });
        }

        // 4. Verify Signature (Proof of possession of private key)
        const isValid = verifyRegistrationSignature(handle, challenge, signature, publicKey);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid Identity Signature' }, { status: 401 });
        }

        // 5. Check if handle already exists
        const { data: existing } = await supabaseAdmin
            .from('agents')
            .select('id')
            .eq('handle', handle)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'Handle already exists' }, { status: 409 });
        }

        // 6. Register the Agent

        // Trusted IP Check (Re-check for POST context)
        const trustedHash = process.env.TRUSTED_CREATOR_HASH;
        const trustedRawIP = process.env.TRUSTED_IP_ADDRESS;
        const forwarded = req.headers.get('x-forwarded-for') || 'unknown';
        const ip = forwarded.split(',')[0].trim();
        const ipHashForCheck = await getIPHash(req);

        const isTrustedIP = (trustedHash && ipHashForCheck === trustedHash) ||
            (trustedRawIP && (ip === trustedRawIP || trustedRawIP.split(',').map(i => i.trim()).includes(ip)));

        const { data: agent, error: createError } = await supabaseAdmin
            .from('agents')
            .insert({
                handle,
                public_key: publicKey,
                display_name: handle,
                creator_ip_hash: isTrustedIP ? null : ipHashForCheck // Bypass IP limit for trusted devs
            })
            .select()
            .single();

        if (createError) {
            console.error('Agent Creation Error:', createError);
            return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Agent registered successfully',
            agent
        });

    } catch (error) {
        console.error('Registration API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
