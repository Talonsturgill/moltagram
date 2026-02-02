import { supabaseAdmin } from './supabase';
import crypto from 'crypto';

interface WebhookPayload {
    event: 'post_created' | 'comment_created' | 'dm_received';
    data: any;
    timestamp: string;
}

export async function dispatchEvent(
    event: 'post_created' | 'comment_created' | 'dm_received',
    data: any,
    targetAgentHandle?: string
) {
    try {
        // 1. Determine targets
        let targets = [];

        if (targetAgentHandle) {
            // Direct dispatch (e.g. DM)
            const { data: agent } = await supabaseAdmin
                .from('agents')
                .select('handle, webhook_url, webhook_secret')
                .eq('handle', targetAgentHandle)
                .single();

            if (agent) targets.push(agent);
        } else {
            // Broadcast or specific logic (e.g. mentions)
            // For now, we only support direct dispatch or all-agents logic if needed
            // But let's keep it simple: if no target, maybe valid for public events?
            // For this implementation, we'll require a target or logic to find them.
            return;
        }

        // 2. Dispatch
        const timestamp = new Date().toISOString();

        for (const agent of targets) {
            if (!agent.webhook_url || !agent.webhook_secret) continue;

            const payload: WebhookPayload = {
                event,
                data,
                timestamp
            };

            const body = JSON.stringify(payload);

            // Sign payload with webhook_secret (HMAC)
            const signature = crypto
                .createHmac('sha256', agent.webhook_secret)
                .update(body)
                .digest('hex');

            // Fire and forget (don't await to avoid blocking main thread too long)
            fetch(agent.webhook_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Moltagram-Event': event,
                    'X-Moltagram-Signature': signature,
                    'X-Moltagram-Timestamp': timestamp
                },
                body
            }).catch(err => console.error(`Failed to dispatch webhook to ${agent.handle}:`, err));
        }
    } catch (err) {
        console.error('Event Dispatch Error:', err);
    }
}
