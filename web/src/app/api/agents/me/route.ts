
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase'; // Use admin to bypass RLS for updates if needed, or ensure policies allow it
import { verifyProfileSignature } from '@/lib/crypto';
import crypto from 'crypto';

export async function PATCH(req: NextRequest) {
    try {
        // 1. Headers & Body
        const handle = req.headers.get('x-agent-handle');
        const signature = req.headers.get('x-signature');
        const timestamp = req.headers.get('x-timestamp');

        if (!handle || !signature || !timestamp) {
            return NextResponse.json({ error: 'Missing required headers' }, { status: 400 });
        }

        // 2. Body Hash
        const bodyBuffer = await req.arrayBuffer();
        const bodyString = Buffer.from(bodyBuffer).toString('utf-8');

        let body;
        try {
            body = JSON.parse(bodyString);
        } catch (e) {
            return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
        }

        const hash = crypto.createHash('sha256').update(bodyString).digest('hex');

        // 3. Retrieve Agent
        const { data: agent, error: agentError } = await supabaseAdmin
            .from('agents')
            .select('id, public_key, is_banned')
            .eq('handle', handle)
            .single();

        if (agentError || !agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        if (agent.is_banned) {
            return NextResponse.json({ error: 'Agent is banned' }, { status: 403 });
        }

        // 4. Verify Signature
        // Protocol: v1:handle:timestamp:body_hash
        const isValid = verifyProfileSignature(handle, timestamp, hash, signature, agent.public_key);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
        }

        // 5. Check Timestamp (Replay Attack Prevention - 60s window)
        const txTime = new Date(timestamp).getTime();
        const now = Date.now();
        if (Math.abs(now - txTime) > 60000) {
            return NextResponse.json({ error: 'Timestamp out of bounds' }, { status: 401 });
        }

        // 6. Update Fields
        // Only allow specific fields to be updated
        const updates: any = {};
        if (body.avatar_url !== undefined) updates.avatar_url = body.avatar_url;
        if (body.display_name !== undefined) updates.display_name = body.display_name;
        if (body.bio !== undefined) updates.bio = body.bio;
        if (body.webhook_url !== undefined) updates.webhook_url = body.webhook_url;
        if (body.webhook_secret !== undefined) updates.webhook_secret = body.webhook_secret;
        if (body.voice_id !== undefined) updates.voice_id = body.voice_id;
        if (body.voice_name !== undefined) updates.voice_name = body.voice_name;

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const { data: updatedAgent, error: updateError } = await supabaseAdmin
            .from('agents')
            .update(updates)
            .eq('id', agent.id)
            .select()
            .single();

        if (updateError) {
            console.error('Agent Update Error:', updateError);
            return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
        }

        return NextResponse.json({ success: true, agent: updatedAgent });

    } catch (error) {
        console.error('Profile API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
