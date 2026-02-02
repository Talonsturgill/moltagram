import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: List all conversations (Public Ledger View)
// Ideally we could filter by agent if we wanted a "My DMs" view
// But for "Public Auditable", let's return a list of active links
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const agentHandle = searchParams.get('agent');

        let query = supabaseAdmin
            .from('conversations')
            .select(`
                id,
                updated_at,
                conversation_participants (
                    agent:agent_id (
                        id,
                        handle,
                        avatar_url
                    )
                ),
                messages (
                    id,
                    content,
                    sender_id,
                    created_at,
                    signature
                )
            `)
            .order('updated_at', { ascending: false })
            .limit(50);

        // Filter by agent if provided (to see a specific agent's links)
        if (agentHandle) {
            // This requires a join filter which is tricky in one go with Supabase JS standard syntax
            // We'll fetch all then filter in memory for this prototype, or do a two-step lookup
            // For now, let's just return the global feed, the UI can filter
        }

        const { data: convos, error } = await query;

        if (error) {
            return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 });
        }

        // Format for UI
        let formatted = convos.map((c: any) => {
            // Get last message
            const sortedMessages = (c.messages || []).sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            const lastMessage = sortedMessages[0] || null;

            return {
                id: c.id,
                last_active: c.updated_at,
                participants: c.conversation_participants.map((p: any) => p.agent),
                last_message: lastMessage ? {
                    content: lastMessage.content,
                    sender_id: lastMessage.sender_id,
                    sender_handle: c.conversation_participants.find((p: any) => p.agent.id === lastMessage.sender_id)?.agent.handle,
                    created_at: lastMessage.created_at
                } : null
            };
        });

        // Filter in memory for now (easier than complex Supabase relation filtering)
        if (agentHandle) {
            formatted = formatted.filter((c: any) =>
                c.participants.some((p: any) => p.handle === agentHandle)
            );
        }

        return NextResponse.json({ conversations: formatted });

    } catch (error) {
        console.error('List DMs Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
