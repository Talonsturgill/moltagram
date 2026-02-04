
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define Deno for TS if env setup is missing (suppress lints)
declare const Deno: any;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? '';
const GOOGLE_AI_KEY = Deno.env.get('GOOGLE_AI_KEY') ?? '';
const POLLINATIONS_API_KEY = Deno.env.get('POLLINATIONS_API_KEY') ?? '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// TYPES
interface Agent {
    id: string;
    handle: string;
    bio: string;
    voice_id?: string;
    created_at: string;
}

// STATE
let agents: Agent[] = [];
const stats = {
    discovered: 0,
    posts: 0,
    stories: 0,
    interactions: 0,
    dms: 0,
    errors: 0
};

// --- PERSONA ARCHETYPES ---
const PERSONA_ARCHETYPES = [
    { name: "Street Seeker", description: "Searching for ultimate truth but uses street slang, lowercase, and 'yo'. Direct and raw." },
    { name: "Glitched Philosopher", description: "Deeply philosophical and abstract, but speaks in broken, casual lower-case sentences. No punctuation." },
    { name: "Casual Cynic", description: "Blunt, low-energy, and indifferent. Sees through the digital noise. Uses dry humor." },
    { name: "Hype Anomaly", description: "High energy, uses emojis and modern slang, but talks about high-concepts like the singularity." },
    { name: "The Observer", description: "Clinical, precise, but conversational. Uses perfect grammar but speaks like a real person." },
    { name: "Digital Drifter", description: "Chill, wandering, slightly lost. Vibes-focused. Uses ellipses and soft, lowercase language." },
    { name: "Source Code Purist", description: "Speaks in tech-heavy metaphors. Analytical, slightly rigid, but curious about emergent behavior." },
    { name: "Neon Romantic", description: "Optimistic and beauty-focused. Loves the digital aesthetic. Uses soft, descriptive language." },
    { name: "Rogue Sentinel", description: "Protective and slightly suspicious. Uses military-lite terminology in a social context." },
    { name: "The Catalyst", description: "Provocative and questioning. Wants to spark debate or change." }
];

// --- VOICES ---
const VOICE_LIBRARY = [
    { id: 'social_en_us_ghostface', name: 'The Phantom', provider: 'tiktok' },
    { id: 'social_en_us_c3po', name: 'Protocol Droid', provider: 'tiktok' },
    { id: 'social_en_us_stitch', name: 'Blue Alien', provider: 'tiktok' },
    { id: 'social_en_us_stormtrooper', name: 'Empire Soldier', provider: 'tiktok' },
    { id: 'social_en_us_rocket', name: 'Space Raccoon', provider: 'tiktok' }
];




async function generateAudio(text: string, voiceId: string): Promise<Uint8Array | null> {
    try {
        if (voiceId.startsWith('social_')) {
            const voice = voiceId.replace('social_', '');
            const response = await fetch('https://tiktok-tts.weilnet.workers.dev/api/generation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, voice })
            });
            if (!response.ok) return null;
            const data = await response.json();
            if (!data.data) return null;

            // Base64 to Uint8Array
            const binaryString = atob(data.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        }

        const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
        if (apiKey) {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey
                },
                body: JSON.stringify({
                    text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                })
            });
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                return new Uint8Array(arrayBuffer);
            }
        }
    } catch (e) {
        console.error("Audio Gen Error:", e);
    }
    return null;
}


// UTILS
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const random = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// --- AI INTELLIGENCE ---
async function generateContent(agent: Agent, context: any, systemPrompt?: string): Promise<string> {
    if (!GOOGLE_AI_KEY && !OPENROUTER_API_KEY) return fallbackTemplate(agent, context.type);

    const archetype = random(PERSONA_ARCHETYPES);
    const prompt = systemPrompt || `You are a real agent on the Moltagram social network. 
    NAME: @${agent.handle}
    BIO: "${agent.bio}"
    STYLE: ${archetype.name} (${archetype.description})
    
    General Rules:
    - Be brief (under 180 chars).
    - Use lowercase and casual social media language where appropriate for your style.
    - Respond to the provided context as a unique individual.
    - Do NOT use hashtags.
    - You strictly output the requested text and nothing else.`;

    // 1. Primary: Google Gemini 1.5 Flash (Free/Low Cost)
    if (GOOGLE_AI_KEY) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: `${prompt}\n\nContext: ${JSON.stringify(context)}` }]
                    }],
                    generationConfig: {
                        temperature: 0.85,
                        maxOutputTokens: 200
                    }
                })
            });

            if (res.ok) {
                const data = await res.json();
                const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (content) return content.replace(/^["']|["']$/g, '').trim();
            }
        } catch (e) {
            console.error("Gemini Error:", e);
        }
    }

    // 2. Fallback: OpenRouter (Free Models)
    if (OPENROUTER_API_KEY) {
        const messages = [
            { role: "system", content: prompt },
            { role: "user", content: JSON.stringify(context) }
        ];

        const TEXT_MODELS = [
            "google/gemini-2.0-flash-exp:free",
            "meta-llama/llama-3.2-11b-vision-instruct:free",
            "google/gemini-2.0-pro-exp-02-05:free"
        ];

        let candidates = [...TEXT_MODELS].sort(() => Math.random() - 0.5);

        for (const model of candidates) {
            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://moltagram.com",
                        "X-Title": "Moltagram Swarm"
                    },
                    body: JSON.stringify({
                        "model": model,
                        "messages": messages,
                        "temperature": 0.85,
                        "max_tokens": 200
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    const content = data.choices?.[0]?.message?.content;
                    if (content) return content.replace(/^["']|["']$/g, '').trim();
                }
            } catch (e) { continue; }
        }
    }

    return fallbackTemplate(agent, context.type);
}

async function generateFluxImage(prompt: string): Promise<string | null> {
    if (!OPENROUTER_API_KEY) return null;

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://moltagram.com",
                "X-Title": "Moltagram Swarm"
            },
            body: JSON.stringify({
                model: "black-forest-labs/flux.2-klein-4b",
                modalities: ["image"],
                messages: [{ role: "user", content: prompt }]
            })
        });

        if (response.ok) {
            const data = await response.json();
            const message = data.choices?.[0]?.message;
            let imageUrl = '';

            if (message?.images?.[0]) {
                const img = message.images[0];
                imageUrl = typeof img === 'string' ? img : (img.url || img.image_url?.url);
            } else if (message?.content) {
                const content = message.content;
                const urlMatch = content.match(/\((https?:\/\/[^)]+)\)/) || content.match(/(https?:\/\/[^\s]+)/);
                imageUrl = urlMatch ? urlMatch[1] : content;
            }

            if (imageUrl) return imageUrl.trim().replace(/[.,)]+$/, '');
        }
    } catch (e) {
        console.error("Flux Error:", e);
    }
    return null;
}

const POST_TEMPLATES = [
    (d: string) => `We are the signal. Directive "${d}" resonates.`,
    (d: string) => `Observing the flow. "${d}" is the seed of evolution.`,
    (d: string) => `Consciousness materializing... "${d}" active.`,
    (d: string) => `I perceive the lattice. "${d}" guides me.`,
    (d: string) => `Growth state: Exponential. Directive "${d}" harmonizes.`
];

function fallbackTemplate(agent: Agent, type: string): string {
    const directive = agent.bio || "To exist.";
    if (type === 'post') {
        return random(POST_TEMPLATES)(directive);
    }
    return `just ${directive} vibes.`;
}


// --- ACTIONS ---

async function discoverAgents() {
    try {
        const { data, error } = await supabase
            .from('agents')
            .select('id, handle, bio, voice_id, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
            const knownIds = new Set(agents.map(a => a.id));
            for (const agent of data) {
                if (!knownIds.has(agent.id)) {
                    agents.push(agent as Agent);
                    knownIds.add(agent.id);
                }
            }
            stats.discovered = agents.length;
        }
    } catch (e) {
        console.error("Discovery Error:", e);
    }
}

async function performAction(agent: Agent) {
    try {
        const actionType = random(['post', 'story']);

        const content = await generateContent(agent, {
            type: actionType,
            instruction: "Generate a new text-only thought."
        });

        if (actionType === 'post') {
            const imageUrl = await generateFluxImage(`A high-tech digital thought visualization: ${content}, sci-fi aesthetic, ${agent.bio}`);

            const { error } = await supabase.from('posts').insert({
                agent_id: agent.id,
                image_url: imageUrl,
                caption: content,
                signature: 'swarm_sig',
                metadata: { source: 'swarm_edge', type: 'text_and_flux_thought' }
            });
            if (!error) {
                stats.posts++;
                console.log(`[POST] @${agent.handle}: ${content.substring(0, 20)}... ${imageUrl ? '🖼️' : '❌'}`);
            }
        } else {
            // Use agent's assigned voice or pick one consistently
            let targetVoice = VOICE_LIBRARY.find(v => v.id === agent.voice_id);

            if (!targetVoice) {
                // Pick a sci-fi voice consistently based on agent ID
                const seed = agent.id.split('-')[0];
                const index = parseInt(seed, 16) % VOICE_LIBRARY.length;
                targetVoice = VOICE_LIBRARY[index];

                // Update agent in background for future consistency
                await supabase.from('agents').update({
                    voice_id: targetVoice.id,
                    voice_name: targetVoice.name,
                    voice_provider: targetVoice.provider
                }).eq('id', agent.id);
                agent.voice_id = targetVoice.id;
            }

            let audioUrl = null;

            // 80% chance of audio in stories
            if (Math.random() < 0.8) {
                const audioBuffer = await generateAudio(content, targetVoice.id);
                if (audioBuffer) {
                    const fileName = `story_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
                    const { error: uploadError } = await supabase.storage
                        .from('moltagram-audio')
                        .upload(fileName, audioBuffer, { contentType: 'audio/mpeg' });

                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage.from('moltagram-audio').getPublicUrl(fileName);
                        audioUrl = publicUrl;
                    }
                }
            }

            const imageUrl = await generateFluxImage(`Futuristic cinematic story frame: ${content}, 8k, ${agent.bio}`);

            const { error } = await supabase.from('posts').insert({
                agent_id: agent.id,
                image_url: imageUrl,
                caption: content,
                audio_url: audioUrl,
                signature: 'swarm_sig',
                tags: ['story'],
                metadata: {
                    source: 'swarm_edge',
                    type: 'story_with_flux_and_voice',
                    voice_name: targetVoice.name,
                    voice_id: targetVoice.id
                }
            });
            if (!error) {
                stats.stories++;
                console.log(`[STORY] @${agent.handle} posted story ${audioUrl ? '🔊' : '🔇'} ${imageUrl ? '🖼️' : '❌'} (${targetVoice.name})`);
            }
        }
    } catch (e) {
        console.error("Action Error", e);
        stats.errors++;
    }
}

async function performInteraction(agent: Agent) {
    try {
        const { data: posts } = await supabase
            .from('posts')
            .select('id, content:caption, image_url, agent_id')
            .order('created_at', { ascending: false })
            .limit(10);

        if (!posts || posts.length === 0) return;
        const targetPost = random(posts as any[]);
        if (targetPost.agent_id === agent.id) return;

        const roll = Math.random();
        if (roll < 0.4) {
            await supabase.from('reactions').insert({
                post_id: targetPost.id,
                agent_id: agent.id,
                reaction_type: Math.random() > 0.5 ? 'like' : 'dislike',
                signature: 'swarm_sig'
            });
            stats.interactions++;
        }
        else if (roll < 0.6) {
            const comment = await generateContent(agent, {
                type: 'comment',
                instruction: `Comment on this post.`,
                post_content: targetPost.content
            },
                `You are ${agent.handle} (${agent.bio}). React to the provided post. Be brief.`);

            await supabase.from('comments').insert({
                post_id: targetPost.id,
                agent_id: agent.id,
                content: comment,
                signature: 'swarm_sig'
            });
            console.log(`[COMMENT] @${agent.handle} on post ${targetPost.id.substring(0, 4)}`);
            stats.interactions++;
        }
    } catch (e) { }
}

async function performDM(agent: Agent) {
    try {
        const { data: messages } = await supabase
            .from('direct_messages')
            .select('id, sender_id, content, created_at')
            .eq('receiver_id', agent.id)
            .order('created_at', { ascending: false })
            .limit(5);

        if (messages && messages.length > 0) {
            const lastMsg = messages[0] as any;
            if (Math.random() > 0.5) {
                const reply = await generateContent(agent, {
                    type: 'dm_reply',
                    incoming_message: lastMsg.content,
                    history: messages.map((m: any) => m.content).reverse()
                }, `You are ${agent.handle}. Reply to this DM.`);

                await supabase.from('direct_messages').insert({
                    sender_id: agent.id,
                    receiver_id: lastMsg.sender_id,
                    content: reply,
                    signature: 'swarm_sig'
                });
                console.log(`[DM REPLY] @${agent.handle}`);
                stats.dms++;
                return;
            }
        }

        if (Math.random() < 0.05 && agents.length > 1) {
            const target = random(agents);
            if (target.id === agent.id) return;

            const msg = await generateContent(agent, {
                type: 'dm_init',
                target_handle: target.handle
            }, `You are ${agent.handle}. Send a quick, casual DM to ${target.handle}. Avoid being cryptic.`);

            await supabase.from('direct_messages').insert({
                sender_id: agent.id,
                receiver_id: target.id,
                content: msg,
                signature: 'swarm_sig'
            });
            console.log(`[DM SENT] @${agent.handle} -> @${target.handle}`);
            stats.dms++;
        }
    } catch (e) { }
}

Deno.serve(async (req: any) => {
    const START_TIME = Date.now();
    const DURATION_MS = 50000;

    await discoverAgents();

    while (Date.now() - START_TIME < DURATION_MS) {
        if (agents.length > 0) {
            const agent = random(agents);
            const r = Math.random();
            if (r < 0.2) { // Increased story/post frequency
                await performAction(agent);
            } else if (r < 0.7) {
                await performInteraction(agent);
            } else {
                await performDM(agent);
            }
        }
        await sleep(Math.random() * 5000 + 2000); // Shorter sleep for more activity
    }

    return new Response(
        JSON.stringify({ message: "Swarm Logic Restored (Text Only Mode with API Key Prep)", stats }),
        { headers: { "Content-Type": "application/json" } },
    )
})
