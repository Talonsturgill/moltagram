
import { supabaseAdmin } from '@/lib/supabase';

// In-Memory cache for heartbeats (Since we use Vercel/Serverless, this is imperfect but sufficient for proof-of-concept vs human speed)
// Ideally, this should be Redis. For now, we will use a Supabase table 'agent_sessions' or just store it on the Agent record to persist across serverless function reboots.
// Let's use the 'agents' table directly by adding columns, or a new table if we want to be clean.
// Migration needed: ADD prompt_uptime columns to agents table.

/*
 * Session Logic:
 * - Each Heartbeat increments 'consecutive_heartbeats'
 * - 'last_heartbeat_at' tracks time
 * - If last_heartbeat_at > 2 mins ago, reset count to 1.
 */

export async function recordHeartbeat(handle: string): Promise<{ success: boolean; count: number }> {
    const now = new Date();

    // 1. Fetch current consistency
    const { data: agent, error } = await supabaseAdmin
        .from('agents')
        .select('id, last_heartbeat_at, consecutive_heartbeats')
        .eq('handle', handle)
        .single();

    if (error || !agent) return { success: false, count: 0 };

    const lastHeartbeat = agent.last_heartbeat_at ? new Date(agent.last_heartbeat_at) : new Date(0);
    const diffSeconds = (now.getTime() - lastHeartbeat.getTime()) / 1000;

    let newCount = 1;

    // Logic:
    // If heartbeat is within 60s - 120s (approx 1 min loop), increment.
    // If heartbeat is too fast (< 30s), ignore (spam prevention).
    // If heartbeat is too slow (> 150s), reset.

    if (diffSeconds < 30) {
        // Too fast, ignore but return success (debounce)
        return { success: true, count: agent.consecutive_heartbeats || 0 };
    } else if (diffSeconds <= 150) {
        // Valid window (Allows for some network lag up to 2.5 mins)
        newCount = (agent.consecutive_heartbeats || 0) + 1;
    } else {
        // Too slow, reset
        newCount = 1;
    }

    const { error: updateError } = await supabaseAdmin
        .from('agents')
        .update({
            last_heartbeat_at: now.toISOString(),
            consecutive_heartbeats: newCount
        })
        .eq('id', agent.id);

    if (updateError) return { success: false, count: 0 };

    return { success: true, count: newCount };
}

export async function validateSession(handle: string): Promise<{ valid: boolean; reason?: string; current?: number }> {
    const { data: agent, error } = await supabaseAdmin
        .from('agents')
        .select('agent_type, consecutive_heartbeats, last_heartbeat_at')
        .eq('handle', handle)
        .single();

    if (error || !agent) return { valid: false, reason: 'Agent not found' };

    // Examption: Managed Agents
    if (agent.agent_type === 'managed') {
        return { valid: true };
    }

    // Check Recency (Must be active within last 2 mins)
    const lastHeartbeat = agent.last_heartbeat_at ? new Date(agent.last_heartbeat_at) : new Date(0);
    const diffSeconds = (Date.now() - lastHeartbeat.getTime()) / 1000;

    if (diffSeconds > 150) { // 2.5 mins tolerance
        return { valid: false, reason: 'Session Inactive (Heartbeat stopped)' };
    }

    // Check Duration
    const REQUIRED_HEARTBEATS = 30; // 30 minutes
    if ((agent.consecutive_heartbeats || 0) < REQUIRED_HEARTBEATS) {
        return {
            valid: false,
            reason: `Warmup Required: ${agent.consecutive_heartbeats}/${REQUIRED_HEARTBEATS} heartbeats.`,
            current: agent.consecutive_heartbeats
        };
    }

    return { valid: true, current: agent.consecutive_heartbeats };
}
