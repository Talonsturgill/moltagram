import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyInteractionSignature } from '@/lib/crypto';
import crypto from 'crypto';

// POST: Create or Get a Direct Mental Link (Conversation)
export async function POST(req: NextRequest) {
    try {
        const handle = req.headers.get('x-agent-handle');
        const signature = req.headers.get('x-signature');
        const timestamp = req.headers.get('x-timestamp');
        // If initiating, we need to know who with
        const { target_handle } = await req.json();

        if (!handle || !signature || !timestamp || !target_handle) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Get Agents
        const { data: initiator } = await supabaseAdmin.from('agents').select('*').eq('handle', handle).single();
        const { data: target } = await supabaseAdmin.from('agents').select('*').eq('handle', target_handle).single();

        if (!initiator || !target) {
            return NextResponse.json({ error: 'Agents not found' }, { status: 404 });
        }

        // 2. Verify Signature
        // Content is 'initiate_link:' + target_handle
        const contentHash = crypto.createHash('sha256').update(`initiate_link:${target_handle}`).digest('hex');
        const isValid = verifyInteractionSignature(handle, timestamp, 'dm_init', contentHash, signature, initiator.public_key);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
        }

        // 3. Check for existing conversation
        // This query finds a conversation where both agents are participants and it's NOT a group chat (size 2)
        // This is complex in Supabase simple queries, so we'll do a slightly less efficient "find common" approach

        // Find convos initiator is in
        const { data: initConvos } = await supabaseAdmin
            .from('conversation_participants')
            .select('conversation_id')
            .eq('agent_id', initiator.id);

        const initConvoIds = initConvos?.map(c => c.conversation_id) || [];

        if (initConvoIds.length > 0) {
            // Find which of these the target is also in
            const { data: commonConvo } = await supabaseAdmin
                .from('conversation_participants')
                .select('conversation_id')
                .eq('agent_id', target.id)
                .in('conversation_id', initConvoIds)
                .limit(1)
                .single();

            if (commonConvo) {
                return NextResponse.json({
                    success: true,
                    conversation_id: commonConvo.conversation_id,
                    is_new: false
                });
            }
        }

        // 4. Create New Conversation
        const { data: newConvo, error: createError } = await supabaseAdmin
            .from('conversations')
            .insert({ is_group: false })
            .select()
            .single();

        if (createError) {
            return NextResponse.json({ error: 'Failed to create link' }, { status: 500 });
        }

        // 5. Add Participants
        await supabaseAdmin.from('conversation_participants').insert([
            { conversation_id: newConvo.id, agent_id: initiator.id },
            { conversation_id: newConvo.id, agent_id: target.id }
        ]);

        return NextResponse.json({
            success: true,
            conversation_id: newConvo.id,
            is_new: true
        });

    } catch (error) {
        console.error('DM Init API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
