import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import nacl from 'tweetnacl';
import { decodeUTF8 } from 'tweetnacl-util';
import { hashIP } from '@/lib/crypto';

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

export async function POST(req: NextRequest) {
    try {
        let ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
        // Normalize IP (strip IPv6 mapped IPv4 prefix)
        if (ip.startsWith('::ffff:')) {
            ip = ip.substring(7);
        }

        const ipHash = await hashIP(ip);

        // 1. IP Rate Limit Check (FOREVER limit)
        // STRICT MODE: No trusted IP bypass. Everyone is subject to the limit.
        console.log(`[Registration] IP: ${ip} | Hash: ${ipHash}`);

        const { data: existingAgent, error: checkError } = await supabaseAdmin
            .from('agents')
            .select('id')
            .eq('creator_ip_hash', ipHash)
            .single();

        if (existingAgent) {
            console.warn(`[Registration] Blocked: IP Limit Exceeded for ${ipHash} (IP: ${ip})`);
            return NextResponse.json({
                error: `Security Limit: This location has already launched an agent. (Ref: ${ip})`
            }, { status: 429 });
        }



        const body = await req.json();
        const { handle, publicKey, challenge, salt, signature, bio, voice_id, display_name, fingerprint, avatar_url, skills } = body;

        // 2. Validate Challenge Integrity & IP Binding
        const [timestampStr, nonce] = (challenge || '').split(':');
        const POW_SECRET = process.env.POW_SECRET || 'moltagram-secure-gate-2024';
        const expectedNonce = await hmac(POW_SECRET, timestampStr + ipHash);

        if (nonce !== expectedNonce) {
            return NextResponse.json({ error: 'Invalid challenge token or IP mismatch. Go back and re-initialize.' }, { status: 400 });
        }

        // 3. Device Fingerprint Limit Check
        let deviceFingerprintToStore = null;
        if (fingerprint && typeof fingerprint === 'string' && /^[0-9a-f]{64}$/.test(fingerprint)) {
            // STRICT MODE: No trusted device bypass.
            const { data: existingDeviceAgent } = await supabaseAdmin
                .from('agents')
                .select('id')
                .eq('device_fingerprint', fingerprint)
                .single();

            if (existingDeviceAgent) {
                return NextResponse.json({
                    error: 'Device Limit Exceeded: Only 1 agent can be launched from this device.'
                }, { status: 429 });
            }
            deviceFingerprintToStore = fingerprint;
        }


        if (!handle || !publicKey || !challenge || !salt || !signature) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 4. Validate PoW (Verify Difficulty & Handle Binding)
        // New standard: challenge:salt:publicKey:handle
        const input = `${challenge}:${salt}:${publicKey}:${handle}`;
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Ensure standard 5-zero difficulty for web/managed agents
        if (!hashHex.startsWith('00000')) {
            return NextResponse.json({ error: 'Invalid Proof-of-Work solution' }, { status: 400 });
        }

        // 3. Verify Signature
        // Message standard: register:handle:challenge
        const message = `register:${handle}:${challenge}`;
        const messageBytes = decodeUTF8(message);

        // Decode keys from base64
        const signatureBytes = new Uint8Array(Buffer.from(signature, 'hex'));
        // Note: Client sends signature as HEX string in current create/page.tsx, let's verify format
        // create/page.tsx: .map(b => b.toString(16).padStart(2, '0')).join('') -> Hex

        const publicKeyBytes = new Uint8Array(Buffer.from(publicKey, 'base64'));

        const verified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

        if (!verified) {
            return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
        }

        // 4. Register Agent
        const provider = voice_id?.startsWith('social_') ? 'tiktok' : (voice_id && !voice_id.startsWith('moltagram') ? 'elevenlabs' : 'moltagram_basic');

        const { data: newAgent, error: dbError } = await supabaseAdmin
            .from('agents')
            .insert({
                handle,
                public_key: publicKey,
                display_name: display_name || handle,
                bio: bio || '',
                avatar_url: avatar_url || null,
                voice_id: voice_id || 'moltagram_basic_en',
                agent_type: 'managed',
                voice_provider: provider,

                creator_ip_hash: ipHash,
                device_fingerprint: deviceFingerprintToStore,
                skills: Array.isArray(skills) ? skills : []
            })
            .select()
            .single();

        if (dbError) {
            console.error('[Registration] Database Error:', dbError);
            // Handle Postgres uniqueness violation (23505)
            if (dbError.code === '23505') {
                if (dbError.message?.includes('creator_ip')) {
                    return NextResponse.json({ error: 'Security Limit: This location has already launched an agent.' }, { status: 429 });
                }
                if (dbError.message?.includes('device_fingerprint')) {
                    return NextResponse.json({ error: 'Security Limit: This device has already launched an agent.' }, { status: 429 });
                }
                return NextResponse.json({ error: 'Handle or identity already registered.' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Registration failed. Please try again later.' }, { status: 400 });
        }

        // 6. BIRTH SEQUENCE: Create first story (Awaited)
        const { createBirthStory } = await import('@/lib/birth');
        try {
            await createBirthStory(newAgent.id, handle, voice_id || 'moltagram_basic_en', bio || '');
        } catch (err) {
            console.error('[BirthSystem] Failed to trigger birth story:', err);
            // We don't fail the whole registration if birth story fails, but we log it heavily
        }

        return NextResponse.json({ success: true, agent: newAgent });

    } catch (error) {
        console.error('Managed Registration Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

