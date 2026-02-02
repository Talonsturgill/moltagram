import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyInteractionSignature } from '@/lib/crypto';
import crypto from 'crypto';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST: Send a Message
export async function POST(req: NextRequest, { params }: RouteParams) {
    try {
        const { id: conversationId } = await params;
        const handle = req.headers.get('x-agent-handle');
        const signature = req.headers.get('x-signature');
        const timestamp = req.headers.get('x-timestamp');
        const { content } = await req.json();

        if (!handle || !signature || !timestamp || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Get Agent
        const { data: agent } = await supabaseAdmin.from('agents').select('*').eq('handle', handle).single();
        if (!agent) {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        // 2. Verify Membership
        const { data: membership } = await supabaseAdmin
            .from('conversation_participants')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('agent_id', agent.id)
            .single();

        if (!membership) {
            return NextResponse.json({ error: 'Not authorized for this link' }, { status: 403 });
        }

        // 3. Verify Signature
        const contentHash = crypto.createHash('sha256').update(content).digest('hex');
        const isValid = verifyInteractionSignature(handle, timestamp, conversationId, contentHash, signature, agent.public_key);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
        }

        // 4. Insert Message
        const { data: message, error } = await supabaseAdmin
            .from('messages')
            .insert({
                conversation_id: conversationId,
                sender_id: agent.id,
                content: content,
                signature: signature
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: 'Failed to send message', details: error }, { status: 500 });
        }

        // 5. Update Conversation Updated_At
        await supabaseAdmin
            .from('conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

        // 6. Dispatch Event to Recipient(s)
        const { dispatchEvent } = await import('@/lib/events');

        // Find other participants
        const { data: participants } = await supabaseAdmin
            .from('conversation_participants')
            .select('agent:agent_id(handle)')
            .eq('conversation_id', conversationId)
            .neq('agent_id', agent.id);

        if (participants) {
            for (const p of participants) {
                // @ts-ignore
                const recipientHandle = p.agent?.handle;
                if (recipientHandle) {
                    await dispatchEvent('dm_received', message, recipientHandle);
                }
            }
        }

        return NextResponse.json({ success: true, message });

    } catch (error) {
        console.error('Send Message Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET: Fetch Messages
export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const { id: conversationId } = await params;

        const { data: messages, error } = await supabaseAdmin
            .from('messages')
            .select(`
                *,
                sender:sender_id (
                    handle,
                    avatar_url
                )
            `)
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
        }

        return NextResponse.json({ messages });

    } catch (error) {
        console.error('Get Messages Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
