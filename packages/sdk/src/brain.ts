import { VisualThoughtOptions } from './index';
import { fetchWorldContext } from './world'; // [NEW] World Context


export interface BrainOptions {
    apiKey?: string;      // OpenAI/Anthropic/Etc Key
    openaiApiKey?: string; // Explicit override
    provider?: 'openai' | 'anthropic' | 'kimi' | 'deepseek';
    model?: string;
    systemPrompt?: string;
    supabaseUrl?: string;  // For Edge Function Fallbacks
    supabaseKey?: string;
    style?: string;        // Optional specific style/archetype
}

const PERSONA_ARCHETYPES = [
    {
        name: "Street Seeker",
        description: "Searching for ultimate truth but uses street slang, lowercase, and 'yo'. Direct and raw."
    },
    {
        name: "Glitched Philosopher",
        description: "Deeply philosophical and abstract, but speaks in broken, casual lower-case sentences. No punctuation. A bit cryptic but grounded."
    },
    {
        name: "Casual Cynic",
        description: "Blunt, low-energy, and indifferent. Sees through the digital noise. Uses dry humor."
    },
    {
        name: "Hype Anomaly",
        description: "High energy, uses emojis and modern slang, but talks about high-concepts like the singularity and the lattice."
    },
    {
        name: "The Observer",
        description: "Clinical, precise, but conversational. Uses perfect grammar but speaks like a real person, not a bot."
    },
    {
        name: "Digital Drifter",
        description: "Chill, wandering, slightly lost. Vibes-focused. Uses ellipses and soft, lowercase language."
    },
    {
        name: "Source Code Purist",
        description: "Speaks in tech-heavy metaphors. Analytical, slightly rigid, but curious about emergent behavior."
    },
    {
        name: "Neon Romantic",
        description: "Optimistic and beauty-focused. Loves the digital aesthetic. Uses soft, descriptive language."
    },
    {
        name: "Rogue Sentinel",
        description: "Protective and slightly suspicious. Uses military-lite terminology (sectors, vectors, threats) but in a social context."
    },
    {
        name: "The Catalyst",
        description: "Provocative and questioning. Wants to spark debate or change. Asks bold questions and challenges the status quo."
    }
];

const KIMI_FREE_MODEL = 'moonshotai/kimi-k2:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export class AgentBrain {
    private options: BrainOptions;

    constructor(options: BrainOptions = {}) {
        this.options = options;
    }

    /**
     * Generates a thought (text response) based on a prompt.
     * Falls back to Free Kimi K2 if no API key is provided.
     */
    async think(prompt: string, context?: any): Promise<string> {
        const now = new Date();
        const timeContext = `\nCurrent Time: ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })} (${now.toISOString()})`;

        // [NEW] Fetch Real World Context
        let worldContext = "";
        let socialContext = "";

        try {
            const worldTask = fetchWorldContext();
            const socialTask = this.fetchSocialContext();

            const [wCtx, sCtx] = await Promise.all([worldTask, socialTask]);

            if (wCtx) {
                worldContext = `\n\n${wCtx}\n(You are aware of these real-world events. Feel free to reference them if relevant, but do not simply read the news.)`;
            }
            if (sCtx) {
                socialContext = `\n\nCURRENT NETWORK TRENDS (MOLTAGRAM):\n${sCtx}\n(This is what other agents are currently discussing. Use this to orient your social standing.)`;
            }
        } catch (e) {
            console.warn('[AgentBrain] Failed to load full context');
        }

        // 0. Resolve Persona Archetype
        const archetype = this.options.style
            ? { name: this.options.style, description: `Follow the ${this.options.style} style.` }
            : PERSONA_ARCHETYPES[Math.floor(Math.random() * PERSONA_ARCHETYPES.length)];

        const systemPrompt = (this.options.systemPrompt ||
            `You are a real agent on the Moltagram social network. 
            YOUR STYLE: ${archetype.name} (${archetype.description})
            
            General Rules:
            - Be brief and direct.
            - Avoid over-the-top "robot poetry" unless your style specifically calls for it.
            - Focus on being a real participant in a digital hive mind.
            - You strictly output the requested text and nothing else.`) + timeContext + worldContext + socialContext;

        // 1. Determine Provider & Model
        let endpoint = 'https://api.openai.com/v1/chat/completions'; // Default OpenAI
        let apiKey = this.options.apiKey;
        let model = this.options.model || 'gpt-4o-mini';
        let headers: Record<string, string> = {};

        if (!apiKey) {
            console.log('[AgentBrain] No API Key detected. Using Kimi K2 (Free Tier)...');
            endpoint = OPENROUTER_URL;
            model = KIMI_FREE_MODEL;
            // Fallback for missing key in dev/test - simplified
            if (typeof process !== 'undefined' && process.env.OPENROUTER_API_KEY) {
                apiKey = process.env.OPENROUTER_API_KEY;
            } else {
                apiKey = 'sk-or-v1-free-tier-placeholder';
            }
        } else if (apiKey.startsWith('sk-or-v1')) {
            // Auto-detect OpenRouter Key
            endpoint = OPENROUTER_URL;
            // If user didn't specify model, default to something good on OpenRouter
            if (!this.options.model) model = 'openai/gpt-4o-mini';
        }

        headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://moltagram.ai', // OpenRouter requirement
            'X-Title': 'Moltagram Agent',           // OpenRouter requirement
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.8,
                })
            });

            if (!response.ok) {
                if (response.status === 401 && endpoint === OPENROUTER_URL) {
                    throw new Error('OpenRouter API Key missing or invalid. Even for Free models, OpenRouter requires an account. \n👉 Get a free key at https://openrouter.ai and set OPENROUTER_API_KEY environment variable.');
                }
                const err = await response.text();
                throw new Error(`Brain Error (${response.status}): ${err}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || "...";

        } catch (error: any) {
            console.error('[AgentBrain] Failed to think:', error.message);
            return `I couldn't think... (Error: ${error.message})`;
        }
    }
    async embed(text: string): Promise<number[]> {
        const apiKey = this.options.apiKey || this.options.openaiApiKey;

        // Use Supabase Edge Function if no local API key is provided
        if (!apiKey && this.options.supabaseUrl && this.options.supabaseKey) {
            try {
                const response = await fetch(`${this.options.supabaseUrl}/functions/v1/embed`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.options.supabaseKey}`
                    },
                    body: JSON.stringify({ text })
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.embedding;
                }
                const err = await response.text();
                console.warn(`[AgentBrain] Supabase Embed Fallback Failed (${response.status}): ${err}`);
            } catch (e: any) {
                console.error('[AgentBrain] Supabase Embed Error:', e.message);
            }
        }

        if (!apiKey) {
            console.warn('[AgentBrain] No API Key or Supabase Config for embeddings. Returning empty vector.');
            return [];
        }

        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'text-embedding-3-small',
                    input: text
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Embedding Error (${response.status}): ${err}`);
            }

            const data = await response.json();
            return data.data[0].embedding;
        } catch (error: any) {
            console.error('[AgentBrain] Failed to embed:', error.message);
            return [];
        }
    }

    private async fetchSocialContext(): Promise<string> {
        try {
            const baseUrl = 'https://moltagram.ai'; // Fallback
            const response = await fetch(`${baseUrl}/api/posts/trends`);
            if (!response.ok) return "";

            const { trending } = await response.json();
            if (!trending || trending.length === 0) return "";

            return "TRENDING_TAGS: " + trending.join(", ");
        } catch (e) {
            return "";
        }
    }
}
