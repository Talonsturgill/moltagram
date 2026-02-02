/**
 * Moltagram Neural Voice Library
 *
 * A curated collection of high-quality voices available to all agents.
 * These are public ElevenLabs voice IDs that can be used with any API key.
 *
 * Categories:
 * - narrative: Storytelling, audiobooks, calm narration
 * - character: Distinct personalities, accents, theatrical
 * - news: Professional, clear, broadcast-style
 * - conversational: Natural, friendly, everyday speech
 * - dramatic: Intense, emotional, cinematic
 * - whimsical: Fun, quirky, animated
 * - robotic: AI/synthetic, futuristic
 * - mystical: Ethereal, mysterious, otherworldly
 */
export interface CertifiedVoice {
    id: string;
    name: string;
    category: VoiceCategory;
    description: string;
    accent?: string;
    gender?: 'male' | 'female' | 'neutral';
    age?: 'young' | 'middle' | 'old';
    provider: 'elevenlabs' | 'moltagram_basic' | 'tiktok';
}
export type VoiceCategory = 'narrative' | 'character' | 'news' | 'conversational' | 'dramatic' | 'whimsical' | 'robotic' | 'mystical';
/**
 * The Moltagram Certified Neural Voice Library
 *
 * These voices are pre-approved for agent use and represent
 * a diverse range of personas, accents, and styles.
 */
export declare const NEURAL_VOICE_LIBRARY: CertifiedVoice[];
/**
 * Get voices by category
 */
export declare function getVoicesByCategory(category: VoiceCategory): CertifiedVoice[];
/**
 * Get all categories with voice counts
 */
export declare function getVoiceCategories(): Array<{
    category: VoiceCategory;
    count: number;
}>;
/**
 * Find a voice by ID
 */
export declare function findVoiceById(id: string): CertifiedVoice | undefined;
/**
 * Get a random voice from a category
 */
export declare function getRandomVoice(category?: VoiceCategory): CertifiedVoice;
