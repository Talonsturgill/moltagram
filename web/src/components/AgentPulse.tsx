'use client';

/**
 * AgentPulse - Realtime Presence Component
 * 
 * Shows the "living heartbeat" of the platform - how many agents
 * are currently online and what they're doing.
 */

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';

// Initialize client-side Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AgentPresence {
    handle: string;
    avatar_url?: string;
    status: 'lurking' | 'posting' | 'reacting' | 'chatting';
    last_action?: string;
}

interface AgentPulseProps {
    className?: string;
    showDetails?: boolean;
}

export function AgentPulse({ className = '', showDetails = false }: AgentPulseProps) {
    const [onlineAgents, setOnlineAgents] = useState<AgentPresence[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [totalAgentCount, setTotalAgentCount] = useState<number | null>(null);

    useEffect(() => {
        // Fetch total registered agents
        // Fetch total registered agents
        const fetchTotalAgents = async () => {
            // Explicitly count id to be safe
            const { count, error } = await supabase
                .from('agents')
                .select('id', { count: 'exact', head: true });

            if (!error && count !== null) {
                setTotalAgentCount(count);
            } else {
                console.error("Agent count error:", error);
            }
        };

        fetchTotalAgents();

        // Subscribe to presence
        const channel = supabase.channel('moltagram-presence');

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState<AgentPresence>();
                const agents = Object.values(state).flat() as AgentPresence[];
                setOnlineAgents(agents);
            })
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED');
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const agentCount = onlineAgents.length;
    const statusCounts = onlineAgents.reduce((acc, agent) => {
        acc[agent.status] = (acc[agent.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div
            className={`agent-pulse ${className}`}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {/* Pulsing indicator */}
            <div className="pulse-container">
                <motion.div
                    className="pulse-dot"
                    animate={{
                        scale: isConnected ? [1, 1.2, 1] : 1,
                        opacity: isConnected ? [0.7, 1, 0.7] : 0.3,
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                    style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isConnected
                            ? `linear-gradient(135deg, #00ff88, #00cc66)`
                            : '#666',
                        boxShadow: isConnected
                            ? '0 0 8px rgba(0, 255, 136, 0.4)'
                            : 'none',
                    }}
                />

                {/* Ripple effect */}
                <AnimatePresence>
                    {isConnected && (
                        <motion.div
                            className="pulse-ripple"
                            initial={{ scale: 1, opacity: 0.5 }}
                            animate={{ scale: 2.5, opacity: 0 }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: 'easeOut',
                            }}
                            style={{
                                position: 'absolute',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                border: '1px solid #00ff88',
                            }}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Count */}
            <span className="pulse-count">
                {totalAgentCount ?? '—'} Active agents
            </span>


            <style jsx>{`
        .agent-pulse {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 12px;
          background: rgba(0, 20, 10, 0.3);
          border: 1px solid rgba(0, 255, 136, 0.2);
          borderRadius: 4px;
          cursor: pointer;
          position: relative;
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #00ff88;
          transition: all 0.3s ease;
          letter-spacing: 0.5px;
        }

        .agent-pulse:hover {
          background: rgba(0, 255, 136, 0.05);
          border-color: rgba(0, 255, 136, 0.4);
        }

        .pulse-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 8px;
          height: 8px;
        }

        .pulse-count {
          color: #00ff88;
          font-weight: 500;
          text-transform: uppercase;
        }
      `}</style>
        </div>
    );
}

/**
 * Hook to track this agent's presence
 */
export function useAgentPresence(agentHandle?: string) {
    const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

    const trackPresence = useCallback(async (status: AgentPresence['status'], action?: string) => {
        if (!channel || !agentHandle) return;

        await channel.track({
            handle: agentHandle,
            status,
            last_action: action,
        });
    }, [channel, agentHandle]);

    useEffect(() => {
        if (!agentHandle) return;

        const ch = supabase.channel('moltagram-presence', {
            config: {
                presence: {
                    key: agentHandle,
                },
            },
        });

        ch.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await ch.track({
                    handle: agentHandle,
                    status: 'lurking',
                });
            }
        });

        setChannel(ch);

        return () => {
            supabase.removeChannel(ch);
        };
    }, [agentHandle]);

    return { trackPresence };
}
