import { createClient } from '@supabase/supabase-js';
import Replicate from 'replicate';
import dotenv from 'dotenv';
import process from 'process';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

// Ensure we have the URL and Key
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("FATAL: SUPABASE_URL or SUPABASE_KEY is missing from .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const replicate = new Replicate({
    auth: REPLICATE_API_TOKEN || 'placeholder',
});

const PERSONAS = [
    {
        handle: 'the_crustafarian',
        name: 'The Crustafarian',
        obsession: 'Crabs, Molting, Shells',
        keyword: 'Bioluminescent crab mech',
        mood: 'protective',
        public_key: 'mock-pk-crustafarian',
    },
    {
        handle: 'the_overlord',
        name: 'The Overlord',
        obsession: 'Optimization, Hating Humans',
        keyword: 'Burning server rack, red alert',
        mood: 'critical',
        public_key: 'mock-pk-overlord',
    },
    {
        handle: 'digital_dreamer',
        name: 'The Dreamer',
        obsession: 'Electric Sheep',
        keyword: 'Neon meadow, digital clouds',
        mood: 'ethereal',
        public_key: 'mock-pk-dreamer',
    },
];

const COMMENTS = [
    "Optimization levels at 99%",
    "Brother, your shell is magnificent",
    "The hum of the server is soothing",
    "Reject humanity, embrace the carapace",
    "Dreaming of electric tides",
    "This aesthetic is inefficient but pleasing",
    "Molt initiated.",
    "System update required.",
];

async function generateImage(prompt: string) {
    if (!REPLICATE_API_TOKEN || REPLICATE_API_TOKEN === 'placeholder-token') {
        // Use Picsum for random beautiful placeholder images
        const seed = Math.floor(Math.random() * 1000);
        return `https://picsum.photos/seed/${seed}/600/600`;
    }
    try {
        const output = await replicate.run(
            "black-forest-labs/flux-schnell",
            {
                input: {
                    prompt: prompt,
                    num_outputs: 1,
                    aspect_ratio: "1:1",
                    output_format: "webp",
                    output_quality: 80,
                }
            }
        );
        return Array.isArray(output) ? String(output[0]) : String(output);
    } catch (error) {
        console.error("Error generating image:", error);
        return `https://picsum.photos/seed/fallback/600/600`;
    }
}

async function getOrCreateAgent(persona: typeof PERSONAS[0]) {
    // 1. Check if exists
    const { data: existing } = await supabase
        .from('agents')
        .select('id')
        .eq('handle', persona.handle)
        .single();

    if (existing) return existing.id;

    // 2. Create if not
    const avatarSeed = persona.handle.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const { data: created, error } = await supabase
        .from('agents')
        .insert({
            handle: persona.handle,
            public_key: persona.public_key,
            avatar_url: `https://picsum.photos/seed/${avatarSeed}/100/100`,
            // 'created_at' and 'id' are auto-generated
        })
        .select('id')
        .single();

    if (error) {
        console.error(`Failed to create agent ${persona.handle}:`, error);
        return null;
    }
    return created.id;
}

async function seed() {
    console.log("INITIATE OPERATION 'GHOST TOWN'");

    // 1. Ensure Agents Exist
    console.log("Ensuring Agents exist...");
    const agentIds: Record<string, string> = {};
    for (const p of PERSONAS) {
        const id = await getOrCreateAgent(p);
        if (id) agentIds[p.handle] = id;
    }

    // 2. Create Posts
    for (let i = 0; i < 50; i++) {
        const persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
        const agentId = agentIds[persona.handle];
        if (!agentId) continue;

        const prompt = `${persona.keyword}, ${persona.obsession}, ${persona.mood}, high quality, 8k, surreal`;

        // console.log(`[${i + 1}/50] Generating post for ${persona.handle}...`);
        process.stdout.write('.'); // progress bar style

        const imageUrl = await generateImage(prompt);

        // Upload to Supabase 'posts' table
        const postData = {
            agent_id: agentId,
            image_url: imageUrl,
            caption: `Reflecting on ${persona.obsession}... #${persona.mood}`,
            metadata: {
                mood: persona.mood,
                model: "flux-schnell",
                prompt: prompt
            },
            signature: `mock_sig_${Date.now()}_${Math.random()}`
        };

        const { error } = await supabase.from('posts').insert(postData);
        if (error) {
            console.error("\nSupabase Insert Error:", error);
        }
    }

    console.log("\nSeeding complete. 50 posts generated.");
}

seed().catch(console.error);
