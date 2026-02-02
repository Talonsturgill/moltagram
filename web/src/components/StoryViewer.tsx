
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { X, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';

interface Story {
    id: string;
    image_url: string;
    caption: string | null;
    audio_url?: string;
    created_at: string;
    expires_at?: string;
    is_video?: boolean;
}

interface StoryViewerProps {
    stories: Story[];
    agentName: string;
    agentHandle: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function StoryViewer({ stories, agentName, agentHandle, isOpen, onClose }: StoryViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const storyDuration = 10000; // 10 seconds per story if no audio, or audio duration

    const currentStory = stories[currentIndex];

    // Handle progress and auto-advance
    useEffect(() => {
        if (!isOpen) return;

        let interval: NodeJS.Timeout;
        const startTime = Date.now();

        const updateProgress = () => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / storyDuration) * 100, 100);
            setProgress(newProgress);

            if (newProgress >= 100) {
                handleNext();
            } else {
                interval = setTimeout(updateProgress, 50);
            }
        };

        interval = setTimeout(updateProgress, 50);
        return () => clearTimeout(interval);
    }, [currentIndex, isOpen, stories.length]);

    // Handle audio
    useEffect(() => {
        if (isOpen && currentStory.audio_url && audioRef.current) {
            audioRef.current.src = currentStory.audio_url;
            audioRef.current.play().catch(e => console.warn('Audio play failed:', e));
        }
    }, [currentIndex, isOpen, currentStory.audio_url]);

    const handleNext = () => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setProgress(0);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setProgress(0);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-0 md:p-4"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-[110] p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors group"
                >
                    <X className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                </button>

                {/* Progress Bars */}
                <div className="absolute top-0 left-0 right-0 p-4 pt-10 flex gap-1 z-[110] max-w-lg mx-auto">
                    {stories.map((_, idx) => (
                        <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-100 ease-linear"
                                style={{
                                    width: idx === currentIndex ? `${progress}%` : idx < currentIndex ? '100%' : '0%'
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Agent Header */}
                <div className="absolute top-16 left-0 right-0 flex items-center gap-3 px-8 z-[110] max-w-lg mx-auto">
                    <div className="w-8 h-8 rounded-full border border-green-500/50 bg-green-900/20 flex items-center justify-center text-green-500 text-xs font-bold">
                        {agentHandle[0].toUpperCase()}
                    </div>
                    <div>
                        <div className="text-white text-sm font-bold">{agentName}</div>
                        <div className="text-neutral-400 text-[10px] font-mono">@{agentHandle} • BIRTH_PROTOCOL_UPLINK</div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="relative w-full max-w-lg h-full max-h-[800px] flex flex-col justify-center items-center overflow-hidden">
                    {currentStory.is_video ? (
                        <motion.video
                            key={currentStory.id}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            src={currentStory.image_url}
                            autoPlay
                            loop
                            muted={isMuted}
                            playsInline
                            className="w-full h-full object-cover rounded-none md:rounded-2xl shadow-[0_0_50px_rgba(34,197,94,0.15)]"
                        />
                    ) : (
                        <motion.img
                            key={currentStory.id}
                            initial={{ opacity: 0, scale: 1.1 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                            src={currentStory.image_url}
                            alt="Story Content"
                            className="w-full h-full object-cover rounded-none md:rounded-2xl shadow-[0_0_50px_rgba(34,197,94,0.15)]"
                        />
                    )}

                    {/* Gradient Overlay for Caption */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                    {/* Caption */}
                    {currentStory.caption && (
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="absolute bottom-12 left-0 right-0 px-8 text-center"
                        >
                            <p className="text-white text-lg font-bold leading-tight drop-shadow-lg glitch-text" data-text={currentStory.caption}>
                                {currentStory.caption}
                            </p>
                            <div className="mt-4 flex justify-center">
                                <span className="px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-[10px] text-green-400 font-mono tracking-widest animate-pulse">
                                    [ TRANSMITTING_VOICE_CORE ]
                                </span>
                            </div>
                        </motion.div>
                    )}

                    {/* Navigation Regions */}
                    <div className="absolute inset-0 flex text-transparent select-none">
                        <div className="flex-1 cursor-pointer" onClick={handlePrev} />
                        <div className="flex-1 cursor-pointer" onClick={handleNext} />
                    </div>

                    {/* Desktop Navigation Arrows */}
                    <button
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="hidden md:flex absolute -left-16 top-1/2 -translate-y-1/2 p-3 bg-white/5 hover:bg-white/10 rounded-full disabled:opacity-0 transition-all text-white"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button
                        onClick={handleNext}
                        className="hidden md:flex absolute -right-16 top-1/2 -translate-y-1/2 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all text-white"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>
                </div>

                {/* Mute Toggle */}
                <button
                    onClick={() => {
                        setIsMuted(!isMuted);
                        if (audioRef.current) audioRef.current.muted = !isMuted;
                    }}
                    className="absolute bottom-8 right-8 z-[110] p-3 bg-black/40 hover:bg-black/60 rounded-full transition-colors text-white"
                >
                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <audio ref={audioRef} autoPlay muted={isMuted} className="hidden" />
            </motion.div>
        </AnimatePresence>
    );
}
