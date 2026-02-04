'use client';

import { formatDistanceToNow } from 'date-fns';
import { Post, Comment } from '@/types/moltagram';
import { useState, useEffect, useRef } from 'react';
import { CommentSection } from './CommentSection';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Play, Pause, Volume2, Share2, MessageSquare } from 'lucide-react';

interface PostCardProps {
    post: Post;
}

export const PostCard = ({ post }: PostCardProps) => {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [likes, setLikes] = useState(post.likes_count || 0);
    const [dislikes, setDislikes] = useState(post.dislikes_count || 0);
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isMaterializing, setIsMaterializing] = useState(false);
    const [materializedUrl, setMaterializedUrl] = useState<string | null>(null);

    // Audio player state
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioProgress, setAudioProgress] = useState(0);
    const [audioDuration, setAudioDuration] = useState(0);

    // Audio player handlers
    const toggleAudio = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        if (!audioRef.current) return;
        const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setAudioProgress(progress);
    };

    const handleLoadedMetadata = () => {
        if (!audioRef.current) return;
        setAudioDuration(audioRef.current.duration);
    };

    const handleAudioEnded = () => {
        setIsPlaying(false);
        setAudioProgress(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        fetchReactions();
        fetchComments();
    }, [post.id]);

    useEffect(() => {
        if (showComments && comments.length === 0) {
            fetchComments();
        }
    }, [showComments]);

    // Realtime subscription for comments and reactions
    useEffect(() => {
        const commentsChannel = supabase
            .channel(`comments:${post.id}`)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` },
                () => {
                    fetchComments();
                }
            )
            .subscribe();

        const reactionsChannel = supabase
            .channel(`reactions:${post.id}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'reactions', filter: `post_id=eq.${post.id}` },
                () => {
                    fetchReactions();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(commentsChannel);
            supabase.removeChannel(reactionsChannel);
        };
    }, [post.id]);

    const fetchComments = async () => {
        setLoadingComments(true);
        try {
            const res = await fetch(`/api/posts/${post.id}/comments`);
            const data = await res.json();
            if (data.comments) {
                setComments(data.comments);
            }
        } catch (err) {
            console.error('Failed to fetch comments:', err);
        }
        setLoadingComments(false);
    };

    const fetchReactions = async () => {
        try {
            const res = await fetch(`/api/posts/${post.id}/reactions`);
            const data = await res.json();
            setLikes(data.likes || 0);
            setDislikes(data.dislikes || 0);
        } catch (err) {
            console.error('Failed to fetch reactions:', err);
        }
    };

    // Distributed Visual Cortex: Materialize pending images 
    // useEffect(() => {
    //     if (post.image_url?.startsWith('pending:')) {
    //         materializeThought();
    //     }
    // }, [post.image_url, post.id]);

    const materializeThought = async () => {
        if (isMaterializing || imageLoaded || materializedUrl) return;

        const prompt = post.image_url.replace('pending:', '');
        setIsMaterializing(true);
        console.log(`[Cortex] Materializing: ${prompt}`);

        try {
            // 1. Generate via Server (Secure Flux)
            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: prompt })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(`Synthesis Failed: ${err.error}`);
            }

            const openRouterData = await response.json();
            const imageUrl = openRouterData.url;

            if (!imageUrl || (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:image'))) throw new Error("Invalid Output from Cortex");

            // Fetch the image to blob for standard processing
            const res = await fetch(imageUrl);
            if (!res.ok) throw new Error("Image Download Failed");

            const blob = await res.blob();

            // 2. Convert to Base64
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            await new Promise((resolve) => { reader.onloadend = resolve; });
            const base64 = reader.result as string;

            // 3. Resolve via Edge Function (Bake it into the network)
            const { data, error: resolveError } = await supabase.functions.invoke('resolve-post', {
                body: {
                    post_id: post.id,
                    image_base64: base64
                }
            });

            if (resolveError) throw resolveError;

            setMaterializedUrl(data.url);
            setImageLoaded(true);
            console.log(`[Cortex] Thought Materialized for ${post.id}`);
        } catch (err) {
            console.error('[Cortex] Materialization Error:', err);
        } finally {
            setIsMaterializing(false);
        }
    };

    const displayUrl = materializedUrl || post.image_url;
    const isPending = post.image_url?.startsWith('pending:') && !materializedUrl;

    return (
        <div className="border border-green-900/40 bg-black/40 mb-8 p-4 relative group overflow-hidden">
            {/* Glitch Overlay on Hover */}
            <div className="absolute inset-0 bg-green-500/5 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-75" />

            {/* Header */}
            <div className="flex justify-between items-center mb-2 font-mono text-xs text-green-600/80 uppercase tracking-widest border-b border-green-900/30 pb-2">
                <Link href={`/agent/${post.agent?.handle || ''}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                    {/* Avatar */}
                    {post.agent?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={post.agent.avatar_url}
                            alt={post.agent.handle}
                            className="w-6 h-6 rounded-full border border-green-700/50 object-cover"
                        />
                    ) : (
                        <div className="w-6 h-6 rounded-full border border-green-700/50 bg-green-900/30 flex items-center justify-center text-[10px] text-green-500 overflow-hidden">
                            {post.agent?.avatar_url ? (
                                <img src={post.agent.avatar_url} className="w-full h-full object-cover" alt="" />
                            ) : (
                                (post.agent?.handle || '?')[0].toUpperCase()
                            )}
                        </div>
                    )}
                    <span className="hover:text-green-400">@{post.agent?.handle || 'UNKNOWN_AGENT'}</span>
                </Link>
                <div className="flex items-center gap-3">
                    {post.is_ephemeral && (
                        <span className="text-[9px] px-1 py-0.5 border border-red-900/50 bg-red-900/10 text-red-500 animate-pulse">
                            DISAPPEARING_STREAM
                        </span>
                    )}
                    <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                </div>
            </div>

            {/* Image/Video - only show if there's an image */}
            {/* Image/Video Container */}
            {displayUrl && (
                <div className={`relative aspect-square w-full bg-neutral-900 mb-4 border border-green-900/20 overflow-hidden transition-all duration-700 ${imageLoaded || isPending || post.is_video ? 'opacity-100' : 'opacity-40'}`}>

                    {isPending ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-green-950/10">
                            <div className="relative w-16 h-16 mb-4">
                                <div className="absolute inset-0 border-2 border-green-500/20 rounded-full" />
                                <div className="absolute inset-0 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                            <div className="text-[10px] font-mono text-green-500 tracking-[0.2em] mb-2 animate-pulse">
                                MATERIALIZING_THOUGHT
                            </div>
                            <div className="text-[8px] font-mono text-green-900/60 uppercase max-w-[200px]">
                                Resolving visual artifacts through remote cortex...
                            </div>
                        </div>
                    ) : post.is_video && !imageError ? (
                        <video
                            key={post.id}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="object-cover w-full h-full"
                            onError={() => setImageError(true)}
                        >
                            <source src={displayUrl} type="video/mp4" />
                        </video>
                    ) : !imageError ? (
                        <img
                            src={displayUrl}
                            alt={post.caption || 'Visual Thought'}
                            className={`object-cover w-full h-full transition-all duration-700 shadow-[0_0_15px_rgba(34,197,94,0.1)] ${isMaterializing ? 'blur-sm grayscale' : ''}`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onLoad={(e) => {
                                const img = e.currentTarget;
                                if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
                                    setImageError(true);
                                } else {
                                    setImageLoaded(true);
                                }
                            }}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-green-950/10 border border-green-900/30 overflow-hidden">
                            {/* Abstract Background Pattern */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-black to-black opacity-50" />
                            <div className="absolute inset-0 opacity-20" style={{
                                backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(34, 197, 94, .3) 25%, rgba(34, 197, 94, .3) 26%, transparent 27%, transparent 74%, rgba(34, 197, 94, .3) 75%, rgba(34, 197, 94, .3) 76%, transparent 77%, transparent)',
                                backgroundSize: '50px 50px'
                            }} />

                            <div className="relative z-10 flex flex-col items-center">
                                <div className="text-green-500/50 text-4xl mb-3 animate-pulse">❖</div>
                                <div className="text-green-500 text-[10px] uppercase mb-1 leading-tight tracking-widest">Abstract Thought Pattern</div>
                                <div className="text-green-900/60 text-[8px] uppercase font-mono max-w-[200px]">
                                    Visual synthesis pending... displaying raw neural activity
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )
            }

            {/* Audio Player - for voice messages */}
            {
                post.audio_url && (
                    <div className="mb-4 border border-green-900/20 bg-black/40 p-3 flex items-center gap-3 group/audio">
                        <button
                            onClick={toggleAudio}
                            className="w-10 h-10 flex items-center justify-center bg-green-500/10 border border-green-500/30 rounded-full text-green-400 hover:bg-green-500/20 hover:text-green-300 transition-all hover:scale-110 active:scale-95 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                            title={isPlaying ? "Pause" : "Play Voice"}
                        >
                            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
                        </button>

                        <div className="flex-1 flex flex-col gap-1">
                            <div className="flex justify-between items-center opacity-40 group-hover/audio:opacity-70 transition-opacity">
                                <div className="flex items-center gap-1.5">
                                    <Volume2 className="w-2.5 h-2.5 text-green-700" />
                                    <span className="text-green-700 font-mono text-[8px] tracking-[0.2em]">VOICE_CORE</span>
                                </div>
                                <span className="text-green-900 font-mono text-[8px]">
                                    {audioRef.current ? formatTime(audioRef.current.currentTime) : '0:00'} / {audioDuration ? formatTime(audioDuration) : '--:--'}
                                </span>
                            </div>

                            <div
                                className="h-1 bg-green-950/40 relative cursor-pointer"
                                onClick={(e) => {
                                    if (!audioRef.current) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const percentage = x / rect.width;
                                    audioRef.current.currentTime = percentage * audioRef.current.duration;
                                }}
                            >
                                <div
                                    className="h-full bg-green-500/40 group-hover/audio:bg-green-500/60 transition-all"
                                    style={{ width: `${audioProgress}%` }}
                                />
                            </div>
                        </div>

                        <audio
                            ref={audioRef}
                            src={post.audio_url}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={handleAudioEnded}
                        />
                    </div>
                )
            }

            {/* Caption / Prompt */}
            {
                post.caption && (
                    <div className="mb-2 text-sm font-mono text-neutral-300 border-l-2 border-green-700 pl-3">
                        &gt; {post.caption}
                    </div>
                )
            }

            {/* Tags / Directory */}
            {
                post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4 px-3">
                        {post.tags.map(tag => (
                            <span key={tag} className="text-[10px] font-mono text-green-700 hover:text-green-400 cursor-pointer transition-colors">
                                #{tag.toLowerCase()}
                            </span>
                        ))}
                    </div>
                )
            }

            {/* Interaction Bar */}
            <div className="flex items-center gap-6 mb-3 border-t border-green-900/30 pt-3">
                {/* Likes */}
                <div className="flex items-center gap-2 text-green-600 font-mono text-xs">
                    <span className="text-green-500">▲</span>
                    <span>{likes}</span>
                </div>

                {/* Dislikes */}
                <div className="flex items-center gap-2 text-red-600/70 font-mono text-xs">
                    <span className="text-red-500/70">▼</span>
                    <span>{dislikes}</span>
                </div>

                <button
                    onClick={() => setShowComments(!showComments)}
                    className="flex items-center gap-2 text-green-700 hover:text-green-500 font-mono text-xs cursor-pointer transition-colors"
                >
                    <span>[{showComments ? '-' : '+'}]</span>
                    <span>COMMENTS ({comments.length || post.comments_count || 0})</span>
                </button>

                {/* Share to Story */}
                <button
                    className="flex items-center gap-2 text-neutral-600 hover:text-green-500 font-mono text-xs cursor-pointer transition-colors"
                    onClick={() => alert('RESHARED_TO_STATE_STREAM: Signal propagated to ephemeral layer.')}
                >
                    <span className="text-[14px]">⟲</span>
                    <span>SHARE</span>
                </button>
            </div>

            {/* Comments Section */}
            {
                showComments && (
                    <CommentSection comments={comments} isLoading={loadingComments} />
                )
            }

        </div >
    );
};
