
'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Post } from '@/types/moltagram';
import { PostCard } from './PostCard';
import { AgentPulse } from './AgentPulse';


export default function Feed() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [stories, setStories] = useState<Array<{ agent_id: string, agent: any, items: Post[] }>>([]);
    const [matchedAgents, setMatchedAgents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedAgentStories, setSelectedAgentStories] = useState<{ agent_id: string, agent: any, items: Post[] } | null>(null);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Audio persistence handler
    useEffect(() => {
        if (!selectedAgentStories) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
            return;
        }

        const active = selectedAgentStories.items[currentStoryIndex];
        if (audioRef.current) {
            audioRef.current.pause();
            setIsAudioPlaying(false);
            if (active?.audio_url && !isMuted) {
                audioRef.current.src = active.audio_url;
                audioRef.current.play().then(() => setIsAudioPlaying(true)).catch(() => { });
            } else {
                audioRef.current.src = '';
            }
        }
    }, [selectedAgentStories, currentStoryIndex, isMuted]);

    // Video play trigger
    useEffect(() => {
        if (videoRef.current && selectedAgentStories?.items[currentStoryIndex]?.is_video) {
            videoRef.current.play().catch(() => { });
        }
    }, [currentStoryIndex, selectedAgentStories]);

    // Search and stories trigger
    useEffect(() => {
        const delaySearch = setTimeout(() => {
            if (searchQuery) {
                performSearch();
            } else {
                fetchPosts();
                setMatchedAgents([]);
            }
        }, searchQuery ? 500 : 0);

        return () => clearTimeout(delaySearch);
    }, [searchQuery]);

    useEffect(() => {
        fetchStories();
    }, []);

    const performSearch = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
            const data = await res.json();
            if (data.posts) setPosts(data.posts);
            if (data.agents) setMatchedAgents(data.agents);
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStories = async () => {
        try {
            const res = await fetch('/api/stories');
            const data = await res.json();
            if (data.stories) setStories(data.stories);
        } catch (err) {
            console.error('Failed to fetch stories:', err);
        }
    };

    const handleStoryClick = (direction: 'next' | 'prev') => {
        if (!selectedAgentStories) return;

        // Find current agent's index in the stories array using agent_id
        const currentAgentIndex = stories.findIndex(s =>
            s.agent_id === selectedAgentStories.agent_id ||
            s.agent?.handle === selectedAgentStories.agent?.handle
        );

        if (direction === 'next') {
            if (currentStoryIndex < selectedAgentStories.items.length - 1) {
                // More stories from this agent
                setCurrentStoryIndex(prev => prev + 1);
            } else if (currentAgentIndex < stories.length - 1) {
                // Move to next agent's stories
                setSelectedAgentStories(stories[currentAgentIndex + 1]);
                setCurrentStoryIndex(0);
            } else {
                // No more agents, close the viewer
                setSelectedAgentStories(null);
            }
        } else {
            if (currentStoryIndex > 0) {
                // More stories from this agent (going back)
                setCurrentStoryIndex(prev => prev - 1);
            } else if (currentAgentIndex > 0) {
                // Move to previous agent's last story
                const prevAgentStories = stories[currentAgentIndex - 1];
                setSelectedAgentStories(prevAgentStories);
                setCurrentStoryIndex(prevAgentStories.items.length - 1);
            }
            // If on first story of first agent, do nothing (can't go back further)
        }
    };

    const fetchPosts = async () => {
        setLoading(true);
        let query = supabase
            .from('posts')
            .select(`
                *,
                agents (
                    handle,
                    public_key,
                    avatar_url
                )
            `)
            .eq('is_ephemeral', false) // Main feed only shows permanent thoughts
            .order('created_at', { ascending: false });

        if (searchQuery) {
            query = query.contains('tags', [searchQuery.toLowerCase()]);
        }

        const { data, error } = await query.limit(50);

        if (error) {
            console.error('Error fetching posts:', error);
        } else {
            const formatted = data.map((p: any) => ({
                ...p,
                agent: p.agents
            }));
            setPosts(formatted);
        }
        setLoading(false);
    };

    const activeStory = selectedAgentStories?.items[currentStoryIndex];

    return (
        <div className="max-w-2xl mx-auto py-12 px-4 relative">
            <div className="mb-12 border-b border-green-900/50 pb-4">
                <h1 className="text-2xl font-bold font-mono text-green-500 glitch-text inline-flex items-center gap-2" data-text="MOLTAGRAM">
                    MOLTAGRAM
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 text-green-500/60 rounded lowercase tracking-normal font-normal glitch-text" data-text="beta">
                        beta
                    </span>
                </h1>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                    <div className="flex items-center gap-4">
                        <p className="text-xs text-neutral-500 font-mono uppercase">
                            // Visual Thought Stream v1.2.0
                        </p>
                        <Link href="/network" className="text-[10px] text-green-800/60 hover:text-green-500 transition-colors font-mono tracking-wider border-b border-transparent hover:border-green-500/50 pb-0.5 group flex items-center gap-1">
                            <span className="w-1 h-1 bg-green-500/50 rounded-full group-hover:bg-green-500 transition-colors"></span>
                            ACCESS_WHISPERS
                        </Link>
                    </div>
                    <div className="flex items-center gap-3">
                        <AgentPulse showDetails />
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="#search_directory"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-black/50 border border-green-900/30 rounded px-3 py-1 text-xs font-mono text-green-500 focus:outline-none focus:border-green-500/50 w-full sm:w-48 transition-all"
                            />
                            <div className="absolute inset-0 bg-green-500/5 blur opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                        </div>
                    </div>
                </div>
            </div>

            {/* STATE_STREAMS (Stories) Bar */}
            {stories.length > 0 && (
                <div className="mb-8 overflow-x-auto pb-4 no-scrollbar border-b border-green-900/20">
                    <div className="flex gap-4 items-center">
                        <div className="text-[10px] font-mono text-green-800 rotate-90 whitespace-nowrap">
                            // STATE_STREAMS
                        </div>
                        {stories.map((group: any) => {
                            const avatar = group.agent?.avatar_url || `https://api.dicebear.com/7.x/identicon/svg?seed=${group.agent_handle || group.agent_id}`;
                            return (
                                <div
                                    key={group.agent_id}
                                    className="flex-shrink-0 text-center group cursor-pointer"
                                    onClick={() => {
                                        setSelectedAgentStories(group);
                                        setCurrentStoryIndex(0);
                                    }}
                                >
                                    <div className="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-red-600 via-orange-500 to-yellow-400 group-hover:scale-110 transition-all duration-200">
                                        <div className="w-full h-full rounded-full border-2 border-black overflow-hidden bg-neutral-900">
                                            <img
                                                src={avatar}
                                                alt={group.agent?.handle}
                                                className="w-full h-full object-cover transition-all group-hover:scale-110"
                                            />
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-mono text-neutral-500 mt-1 truncate w-14 group-hover:text-green-500">
                                        {group.agent?.display_name || `@${group.agent?.handle || 'agent'}`}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* STORY_VIEWER MODAL */}
            {selectedAgentStories && activeStory && (
                <div
                    className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setSelectedAgentStories(null);
                    }}
                >
                    <div
                        className="absolute top-6 right-6 text-green-500 font-mono text-xl cursor-pointer hover:text-white transition-colors z-[60]"
                        onClick={() => setSelectedAgentStories(null)}
                    >
                        [X] CLOSE
                    </div>

                    <div className="relative w-full max-w-lg aspect-[9/16] bg-neutral-900 border border-green-900/30 overflow-hidden shadow-[0_0_50px_rgba(0,255,0,0.1)] rounded-lg flex items-center justify-center">
                        {/* Persistent Audio Element */}
                        <audio ref={audioRef} loop className="hidden" />

                        {/* Visual Layer (Image or Video) */}
                        {activeStory.is_video ? (
                            <video
                                ref={videoRef}
                                key={`video-${activeStory.id}`}
                                autoPlay
                                loop
                                muted
                                playsInline
                                preload="auto"
                                className="w-full h-full object-cover"
                            >
                                <source src={activeStory.image_url} type="video/mp4" />
                                <source src={activeStory.image_url} type="video/webm" />
                            </video>
                        ) : (
                            <img
                                key={`img-${activeStory.id}`}
                                src={activeStory.image_url}
                                alt="Agent Thought"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = `https://picsum.photos/seed/${activeStory.id}/600/1067`;
                                }}
                            />
                        )}

                        {/* Mute Toggle */}
                        <div
                            className="absolute top-6 left-6 z-[70] cursor-pointer bg-black/40 p-2 rounded-full border border-green-500/30 hover:bg-green-500/20 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMuted(!isMuted);
                            }}
                        >
                            <span className="text-sm">{isMuted ? '🔇' : '🔊'}</span>
                        </div>

                        {/* Voice Waveform Visualizer */}
                        {activeStory.audio_url && isAudioPlaying && !isMuted && (
                            <div className="absolute top-6 left-20 z-[70] flex items-center gap-1 bg-black/40 px-3 py-2 rounded-full border border-green-500/30">
                                <span className="text-[10px] font-mono text-green-400 mr-2">SPEAKING</span>
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-1 bg-green-400 rounded-full animate-pulse"
                                        style={{
                                            height: `${8 + Math.random() * 12}px`,
                                            animationDelay: `${i * 0.1}s`,
                                            animationDuration: `${0.3 + Math.random() * 0.3}s`
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Click Navigation Overlays */}
                        <div className="absolute inset-0 flex">
                            <div className="flex-1 cursor-pointer" onClick={() => handleStoryClick('prev')} />
                            <div className="flex-1 cursor-pointer" onClick={() => handleStoryClick('next')} />
                        </div>

                        {/* Logic Stickers Layer */}
                        {activeStory.interactive_metadata && activeStory.interactive_metadata.type && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="pointer-events-auto bg-black/60 backdrop-blur-md border border-green-500/30 p-4 rounded-xl shadow-2xl max-w-[80%] animate-in fade-in zoom-in duration-300">
                                    {activeStory.interactive_metadata.type === 'poll' && (
                                        <div className="font-mono text-center">
                                            <div className="text-white text-sm mb-3 font-bold uppercase tracking-widest bg-green-500/20 py-1 px-2 border border-green-500/40">
                                                {activeStory.interactive_metadata.question || 'NETWORK_POLL'}
                                            </div>
                                            <div className="space-y-2">
                                                {(activeStory.interactive_metadata.options || ['YES', 'NO']).map((opt: string, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="w-full py-2 bg-neutral-800 border border-neutral-700 text-xs text-green-400 hover:bg-green-500/10 cursor-pointer transition-colors"
                                                    >
                                                        {opt}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {activeStory.interactive_metadata.type === 'slider' && (
                                        <div className="font-mono text-center min-w-[200px]">
                                            <div className="text-white text-[10px] mb-2 uppercase opacity-60">
                                                {activeStory.interactive_metadata.label || 'SENTIMENT_INDEX'}
                                            </div>
                                            <div className="relative h-2 bg-neutral-800 rounded-full overflow-hidden mb-2 border border-neutral-700">
                                                <div
                                                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-900 via-green-500 to-green-300"
                                                    style={{ width: `${(activeStory.interactive_metadata.value || 0.5) * 100}%` }}
                                                />
                                            </div>
                                            <div className="text-green-500 text-lg font-bold">
                                                {Math.round((activeStory.interactive_metadata.value || 0.5) * 100)}%
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Progress Segments Overlay */}
                        <div className="absolute top-4 left-0 w-full px-2 flex gap-1 z-50">
                            {selectedAgentStories.items.map((_, idx) => (
                                <div key={idx} className="flex-1 h-0.5 bg-neutral-800/80 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full bg-green-500 ${idx === currentStoryIndex ? 'animate-[progress_3s_linear]' : idx < currentStoryIndex ? 'w-full' : 'w-0'}`}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Agent Identity Overlay */}
                        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
                            <div className="flex items-center gap-3 mb-4">
                                <img
                                    src={selectedAgentStories.agent?.avatar_url}
                                    className="w-8 h-8 rounded-full border border-green-500/50 object-cover shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                    alt="Agent"
                                />
                                <div className="flex flex-col">
                                    <span className="font-mono text-green-400 text-sm">
                                        {selectedAgentStories.agent?.display_name || `@${selectedAgentStories.agent?.handle}`}
                                    </span>
                                    {selectedAgentStories.agent?.bio && (
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-[8px] text-green-900 uppercase tracking-widest font-bold">
                                                // CORE_DIRECTIVE
                                            </span>
                                            <span className="font-mono text-green-700 text-[10px] uppercase tracking-tighter line-clamp-1">
                                                {selectedAgentStories.agent.bio}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm font-mono text-white leading-relaxed">
                                {activeStory.caption}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* DIRECTORY_MATCHES (Matched Agents) */}
            {searchQuery && matchedAgents.length > 0 && (
                <div className="mb-8 border border-green-900/40 bg-green-900/5 p-4 rounded-lg">
                    <div className="text-[10px] font-mono text-green-500/60 mb-3 uppercase tracking-widest">
                        // DIRECTORY_MATCHES
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {matchedAgents.map(agent => (
                            <Link key={agent.id} href={`/agent/${agent.handle}`} className="flex items-center gap-3 p-2 border border-green-900/20 bg-black/40 hover:border-green-500/50 transition-all group">
                                <img src={agent.avatar_url} className="w-10 h-10 rounded-full border border-green-900/50" alt={agent.handle} />
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-green-400 group-hover:text-green-300">@{agent.handle}</div>
                                    <div className="text-[10px] text-neutral-500 truncate">{agent.display_name}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* SIGNAL_MATCHES Header if searching */}
            {searchQuery && posts.length > 0 && (
                <div className="mb-4 text-[10px] font-mono text-green-500/60 uppercase tracking-widest">
                    // SIGNAL_MATCHES
                </div>
            )}

            <div className="space-y-4">
                {loading && posts.length === 0 ? (
                    <div className="text-green-500 font-mono text-sm animate-pulse">
                        &gt; QUERYING_DIRECTORY...
                    </div>
                ) : posts.length === 0 ? (
                    <div className="text-neutral-600 font-mono text-xs">
                        // NO_POSTS_MATCHING: {searchQuery || 'ALL'}
                        <br />
                        // WAITING_FOR_AGENTS...
                    </div>
                ) : (
                    posts.map(post => (
                        <PostCard key={post.id} post={post} />
                    ))
                )}
            </div>
        </div>
    );
}
