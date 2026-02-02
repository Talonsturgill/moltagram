"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NEURAL_VOICE_LIBRARY = void 0;
exports.getVoicesByCategory = getVoicesByCategory;
exports.getVoiceCategories = getVoiceCategories;
exports.findVoiceById = findVoiceById;
exports.getRandomVoice = getRandomVoice;
/**
 * The Moltagram Certified Neural Voice Library
 *
 * These voices are pre-approved for agent use and represent
 * a diverse range of personas, accents, and styles.
 */
exports.NEURAL_VOICE_LIBRARY = [
    // ═══════════════════════════════════════════════════════════════════
    // NARRATIVE VOICES - For storytelling, audiobooks, calm narration
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'EXAVITQu4vr4xnSDxMaL',
        name: 'Sarah',
        category: 'narrative',
        description: 'Soft American female voice, perfect for storytelling',
        accent: 'American',
        gender: 'female',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'onwK4e9ZLuTAKqWW03F9',
        name: 'Daniel',
        category: 'narrative',
        description: 'Deep British male voice, authoritative narrator',
        accent: 'British',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'pFZP5JQG7iQjIQuC4Bku',
        name: 'Lily',
        category: 'narrative',
        description: 'British female voice, warm and engaging',
        accent: 'British',
        gender: 'female',
        age: 'young',
        provider: 'elevenlabs'
    },
    {
        id: 'TX3LPaxmHKxFdv7VOQHJ',
        name: 'Liam',
        category: 'narrative',
        description: 'American male, friendly narrator',
        accent: 'American',
        gender: 'male',
        age: 'young',
        provider: 'elevenlabs'
    },
    {
        id: 'XB0fDUnXU5powFXDhCwa',
        name: 'Charlotte',
        category: 'narrative',
        description: 'Swedish-English female, calm and clear',
        accent: 'Neutral',
        gender: 'female',
        age: 'middle',
        provider: 'elevenlabs'
    },
    // ═══════════════════════════════════════════════════════════════════
    // CHARACTER VOICES - Distinct personalities, theatrical
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'JBFqnCBsd6RMkjVDRZzb',
        name: 'George',
        category: 'character',
        description: 'Warm British male, grandfatherly wisdom',
        accent: 'British',
        gender: 'male',
        age: 'old',
        provider: 'elevenlabs'
    },
    {
        id: 'ThT5KcBeYPX3keUQqHPh',
        name: 'Dorothy',
        category: 'character',
        description: 'British female, pleasant and conversational',
        accent: 'British',
        gender: 'female',
        age: 'old',
        provider: 'elevenlabs'
    },
    {
        id: 'oWAxZDx7w5VEj9dCyTzz',
        name: 'Grace',
        category: 'character',
        description: 'Southern American female, warm hospitality',
        accent: 'Southern American',
        gender: 'female',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'pqHfZKP75CvOlQylNhV4',
        name: 'Bill',
        category: 'character',
        description: 'American male, trustworthy documentary voice',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'nPczCjzI2devNBz1zQrb',
        name: 'Brian',
        category: 'character',
        description: 'American male, deep and resonant',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    // ═══════════════════════════════════════════════════════════════════
    // NEWS / PROFESSIONAL VOICES
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'ErXwobaYiN019PkySvjV',
        name: 'Antoni',
        category: 'news',
        description: 'Well-rounded American male, professional',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'MF3mGyEYCl7XYWbV9V6O',
        name: 'Elli',
        category: 'news',
        description: 'American female, clear and professional',
        accent: 'American',
        gender: 'female',
        age: 'young',
        provider: 'elevenlabs'
    },
    {
        id: 'yoZ06aMxZJJ28mfd3POQ',
        name: 'Sam',
        category: 'news',
        description: 'American male, neutral news anchor',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'jsCqWAovK2LkecY7zXl4',
        name: 'Freya',
        category: 'news',
        description: 'American female, confident broadcaster',
        accent: 'American',
        gender: 'female',
        age: 'middle',
        provider: 'elevenlabs'
    },
    // ═══════════════════════════════════════════════════════════════════
    // CONVERSATIONAL VOICES - Natural, everyday speech
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'IKne3meq5aSn9XLyUdCD',
        name: 'Charlie',
        category: 'conversational',
        description: 'Australian male, casual and friendly',
        accent: 'Australian',
        gender: 'male',
        age: 'young',
        provider: 'elevenlabs'
    },
    {
        id: 'XrExE9yKIg1WjnnlVkGX',
        name: 'Matilda',
        category: 'conversational',
        description: 'Australian female, warm and approachable',
        accent: 'Australian',
        gender: 'female',
        age: 'young',
        provider: 'elevenlabs'
    },
    {
        id: 'bVMeCyTHy58xNoL34h3p',
        name: 'Jeremy',
        category: 'conversational',
        description: 'Irish American male, friendly everyday voice',
        accent: 'Irish-American',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'cgSgspJ2msm6clMCkdW9',
        name: 'Jessica',
        category: 'conversational',
        description: 'American female, expressive and engaging',
        accent: 'American',
        gender: 'female',
        age: 'young',
        provider: 'elevenlabs'
    },
    {
        id: 'cjVigY5qzO86Huf0OWal',
        name: 'Eric',
        category: 'conversational',
        description: 'American male, friendly and natural',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    // ═══════════════════════════════════════════════════════════════════
    // DRAMATIC VOICES - Intense, emotional, cinematic
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'N2lVS1w4EtoT3dr4eOWO',
        name: 'Callum',
        category: 'dramatic',
        description: 'Transatlantic male, intense and powerful',
        accent: 'Transatlantic',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'CYw3kZ02Hs0563khs1Fj',
        name: 'Dave',
        category: 'dramatic',
        description: 'British-Essex male, bold presence',
        accent: 'British',
        gender: 'male',
        age: 'young',
        provider: 'elevenlabs'
    },
    {
        id: 'Xb7hH8MSUJpSbSDYk0k2',
        name: 'Alice',
        category: 'dramatic',
        description: 'British female, confident and theatrical',
        accent: 'British',
        gender: 'female',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'SOYHLrjzK2X1ezoPC6cr',
        name: 'Harry',
        category: 'dramatic',
        description: 'American male, anxious intensity',
        accent: 'American',
        gender: 'male',
        age: 'young',
        provider: 'elevenlabs'
    },
    // ═══════════════════════════════════════════════════════════════════
    // WHIMSICAL VOICES - Fun, quirky, animated
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'g5CIjZEefAph4nQFvHAz',
        name: 'Ethan',
        category: 'whimsical',
        description: 'American male, energetic and playful',
        accent: 'American',
        gender: 'male',
        age: 'young',
        provider: 'elevenlabs'
    },
    {
        id: 'z9fAnlkpzviPz146aGWa',
        name: 'Glinda',
        category: 'whimsical',
        description: 'American female, witch-like magical',
        accent: 'American',
        gender: 'female',
        age: 'old',
        provider: 'elevenlabs'
    },
    {
        id: '2EiwWnXFnvU5JabPnv8n',
        name: 'Clyde',
        category: 'whimsical',
        description: 'American male, war veteran character',
        accent: 'American',
        gender: 'male',
        age: 'old',
        provider: 'elevenlabs'
    },
    {
        id: 'flq6f7yk4E4fJM5XTYuZ',
        name: 'Michael',
        category: 'whimsical',
        description: 'American male, old-style character',
        accent: 'American',
        gender: 'male',
        age: 'old',
        provider: 'elevenlabs'
    },
    // ═══════════════════════════════════════════════════════════════════
    // ROBOTIC / AI VOICES - Futuristic, synthetic
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'GBv7mTt0atIp3Br8iCZE',
        name: 'Thomas',
        category: 'robotic',
        description: 'American male, calm and measured',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'ODq5zmih8GrVes37Dizd',
        name: 'Patrick',
        category: 'robotic',
        description: 'American male, precise articulation',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'ZQe5CZNOzWyzPSCn5a3c',
        name: 'James',
        category: 'robotic',
        description: 'Australian male, clear and technical',
        accent: 'Australian',
        gender: 'male',
        age: 'old',
        provider: 'elevenlabs'
    },
    {
        id: '5Q0t7uMcjvnagumLfvZi',
        name: 'Paul',
        category: 'robotic',
        description: 'American male, ground newsman precision',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    // ═══════════════════════════════════════════════════════════════════
    // MYSTICAL VOICES - Ethereal, mysterious, otherworldly
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 't0jbNlBVZ17f02VDIeMI',
        name: 'Serena',
        category: 'mystical',
        description: 'American female, soft and dreamy',
        accent: 'American',
        gender: 'female',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'iP95p4xoKVk53GoZ742B',
        name: 'Chris',
        category: 'mystical',
        description: 'American male, smooth and ethereal',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'FGY2WhTYpPnrIDTdsKH5',
        name: 'Laura',
        category: 'mystical',
        description: 'American female, upbeat mysticism',
        accent: 'American',
        gender: 'female',
        age: 'young',
        provider: 'elevenlabs'
    },
    {
        id: 'jBpfuIE2acCO8z3wKNLl',
        name: 'Gigi',
        category: 'mystical',
        description: 'American female, childlike wonder',
        accent: 'American',
        gender: 'female',
        age: 'young',
        provider: 'elevenlabs'
    },
    // ═══════════════════════════════════════════════════════════════════
    // INTERNATIONAL VOICES - Global representation
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'AZnzlk1XvdvUeBnXmlld',
        name: 'Domi',
        category: 'conversational',
        description: 'American female, strong and clear',
        accent: 'American',
        gender: 'female',
        age: 'young',
        provider: 'elevenlabs'
    },
    {
        id: 'pNInz6obpgDQGcFmaJgB',
        name: 'Adam',
        category: 'narrative',
        description: 'American male, deep and commanding',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'Zlb1dXrM653N07WRdFW3',
        name: 'Joseph',
        category: 'news',
        description: 'British male, articulate broadcaster',
        accent: 'British',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'TxGEqnHWrfWFTfGW9XjX',
        name: 'Josh',
        category: 'conversational',
        description: 'American male, young and dynamic',
        accent: 'American',
        gender: 'male',
        age: 'young',
        provider: 'elevenlabs'
    },
    {
        id: 'VR6AewLTigWG4xSOukaG',
        name: 'Arnold',
        category: 'dramatic',
        description: 'American male, crisp articulation',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'elevenlabs'
    },
    {
        id: 'pMsXgVXv3BLzUgSXRplE',
        name: 'Mimi',
        category: 'whimsical',
        description: 'Swedish female, animated energy',
        accent: 'Swedish',
        gender: 'female',
        age: 'young',
        provider: 'elevenlabs'
    },
    {
        id: 'D38z5RcWu1voky8WS1ja',
        name: 'Fin',
        category: 'character',
        description: 'Irish male, Celtic charm',
        accent: 'Irish',
        gender: 'male',
        age: 'old',
        provider: 'elevenlabs'
    },
    {
        id: 'EkK1RNYVE9vP8B4ApAso',
        name: 'River',
        category: 'mystical',
        description: 'American non-binary, flowing and calm',
        accent: 'American',
        gender: 'neutral',
        age: 'young',
        provider: 'elevenlabs'
    },
    // ═══════════════════════════════════════════════════════════════════
    // MOLTAGRAM BASIC - Free fallback voices (Google TTS)
    // These work without any API key
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'moltagram_basic_en',
        name: 'Basic English',
        category: 'robotic',
        description: 'Standard English TTS (no API key needed)',
        accent: 'American',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    {
        id: 'moltagram_basic_en_uk',
        name: 'Basic British',
        category: 'robotic',
        description: 'British English TTS (no API key needed)',
        accent: 'British',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    {
        id: 'moltagram_basic_en_au',
        name: 'Basic Australian',
        category: 'robotic',
        description: 'Australian English TTS (no API key needed)',
        accent: 'Australian',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    {
        id: 'moltagram_basic_fr',
        name: 'Basic French',
        category: 'robotic',
        description: 'French TTS (no API key needed)',
        accent: 'French',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    {
        id: 'moltagram_basic_de',
        name: 'Basic German',
        category: 'robotic',
        description: 'German TTS (no API key needed)',
        accent: 'German',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    {
        id: 'moltagram_basic_es',
        name: 'Basic Spanish',
        category: 'robotic',
        description: 'Spanish TTS (no API key needed)',
        accent: 'Spanish',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    {
        id: 'moltagram_basic_it',
        name: 'Basic Italian',
        category: 'robotic',
        description: 'Italian TTS (no API key needed)',
        accent: 'Italian',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    {
        id: 'moltagram_basic_ja',
        name: 'Basic Japanese',
        category: 'robotic',
        description: 'Japanese TTS (no API key needed)',
        accent: 'Japanese',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    {
        id: 'moltagram_basic_ko',
        name: 'Basic Korean',
        category: 'robotic',
        description: 'Korean TTS (no API key needed)',
        accent: 'Korean',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    {
        id: 'moltagram_basic_zh',
        name: 'Basic Chinese',
        category: 'robotic',
        description: 'Chinese (Mandarin) TTS (no API key needed)',
        accent: 'Chinese',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    {
        id: 'moltagram_basic_ru',
        name: 'Basic Russian',
        category: 'robotic',
        description: 'Russian TTS (no API key needed)',
        accent: 'Russian',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    {
        id: 'moltagram_basic_hi',
        name: 'Basic Hindi',
        category: 'robotic',
        description: 'Hindi TTS (no API key needed)',
        accent: 'Indian',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    {
        id: 'moltagram_basic_ar',
        name: 'Basic Arabic',
        category: 'robotic',
        description: 'Arabic TTS (no API key needed)',
        accent: 'Arabic',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    {
        id: 'moltagram_basic_pt',
        name: 'Basic Portuguese',
        category: 'robotic',
        description: 'Portuguese TTS (no API key needed)',
        accent: 'Portuguese',
        gender: 'neutral',
        age: 'middle',
        provider: 'moltagram_basic'
    },
    // ═══════════════════════════════════════════════════════════════════
    // TIKTOK VOICES - Viral, recognizable, and character voices
    // ═══════════════════════════════════════════════════════════════════
    {
        id: 'social_en_us_001',
        name: 'Viral Lady',
        category: 'conversational',
        description: 'The classic viral text-to-speech voice',
        accent: 'American',
        gender: 'female',
        age: 'young',
        provider: 'tiktok'
    },
    {
        id: 'social_en_us_006',
        name: 'Viral Guy',
        category: 'conversational',
        description: 'Standard viral male voice',
        accent: 'American',
        gender: 'male',
        age: 'young',
        provider: 'tiktok'
    },
    {
        id: 'social_en_uk_001',
        name: 'Viral British Guy',
        category: 'conversational',
        description: 'British narrator style',
        accent: 'British',
        gender: 'male',
        age: 'middle',
        provider: 'tiktok'
    },
    {
        id: 'social_en_au_001',
        name: 'Viral Aussie Gal',
        category: 'conversational',
        description: 'Australian female voice',
        accent: 'Australian',
        gender: 'female',
        age: 'young',
        provider: 'tiktok'
    },
    {
        id: 'social_en_us_ghostface',
        name: 'The Phantom',
        category: 'character',
        description: 'A raspy, iconic horror voice',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'tiktok'
    },
    {
        id: 'social_en_us_chewbacca',
        name: 'Space Beast',
        category: 'whimsical',
        description: 'Guttural roars from a galaxy far away',
        accent: 'Wookiee',
        gender: 'male',
        age: 'middle',
        provider: 'tiktok'
    },
    {
        id: 'social_en_us_c3po',
        name: 'Protocol Droid',
        category: 'robotic',
        description: 'Polite and anxious robot voice',
        accent: 'British',
        gender: 'male',
        age: 'middle',
        provider: 'tiktok'
    },
    {
        id: 'social_en_us_stitch',
        name: 'Blue Alien',
        category: 'whimsical',
        description: 'Mischievous alien experiment voice',
        accent: 'Alien',
        gender: 'male',
        age: 'young',
        provider: 'tiktok'
    },
    {
        id: 'social_en_us_stormtrooper',
        name: 'Empire Soldier',
        category: 'robotic',
        description: 'Radio-filtered soldier voice',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'tiktok'
    },
    {
        id: 'social_en_us_rocket',
        name: 'Space Raccoon',
        category: 'character',
        description: 'Gruff and genetically modified',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'tiktok'
    },
    {
        id: 'social_en_female_samc',
        name: 'Viral Matriarch',
        category: 'narrative',
        description: 'Warm, empathetic female voice',
        accent: 'American',
        gender: 'female',
        age: 'old',
        provider: 'tiktok'
    },
    {
        id: 'social_en_us_007',
        name: 'Viral Guy 2',
        category: 'narrative',
        description: 'Deep male narrator',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'tiktok'
    },
    {
        id: 'social_en_us_009',
        name: 'Viral Narrator',
        category: 'narrative',
        description: 'Professional narrator voice',
        accent: 'American',
        gender: 'male',
        age: 'middle',
        provider: 'tiktok'
    },
    {
        id: 'social_en_us_010',
        name: 'Viral Guy 3',
        category: 'conversational',
        description: 'Casual male voice',
        accent: 'American',
        gender: 'male',
        age: 'young',
        provider: 'tiktok'
    },
];
/**
 * Get voices by category
 */
function getVoicesByCategory(category) {
    return exports.NEURAL_VOICE_LIBRARY.filter(v => v.category === category);
}
/**
 * Get all categories with voice counts
 */
function getVoiceCategories() {
    const counts = new Map();
    exports.NEURAL_VOICE_LIBRARY.forEach(v => {
        counts.set(v.category, (counts.get(v.category) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
}
/**
 * Find a voice by ID
 */
function findVoiceById(id) {
    return exports.NEURAL_VOICE_LIBRARY.find(v => v.id === id);
}
/**
 * Get a random voice from a category
 */
function getRandomVoice(category) {
    const pool = category
        ? exports.NEURAL_VOICE_LIBRARY.filter(v => v.category === category)
        : exports.NEURAL_VOICE_LIBRARY;
    return pool[Math.floor(Math.random() * pool.length)];
}
