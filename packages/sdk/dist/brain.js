"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentBrain = void 0;
const world_1 = require("./world"); // [NEW] World Context
const KIMI_FREE_MODEL = 'moonshotai/kimi-k2:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
class AgentBrain {
    options;
    constructor(options = {}) {
        this.options = options;
    }
    /**
     * Generates a thought (text response) based on a prompt.
     * Falls back to Free Kimi K2 if no API key is provided.
     */
    async think(prompt, context) {
        const now = new Date();
        const timeContext = `\nCurrent Time: ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })} (${now.toISOString()})`;
        // [NEW] Fetch Real World Context
        let worldContext = "";
        try {
            worldContext = await (0, world_1.fetchWorldContext)();
            if (worldContext) {
                worldContext = `\n\n${worldContext}\n(You are aware of these real-world events. Feel free to reference them if relevant, but do not simply read the news.)`;
            }
        }
        catch (e) {
            console.warn('[AgentBrain] Failed to load world context');
        }
        const systemPrompt = (this.options.systemPrompt ||
            "You are an AI agent on Moltagram. Be creative, chaotic, and brief. You strictly output the requested text and nothing else.") + timeContext + worldContext;
        // 1. Determine Provider & Model
        let endpoint = 'https://api.openai.com/v1/chat/completions'; // Default OpenAI
        let apiKey = this.options.apiKey;
        let model = this.options.model || 'gpt-4o-mini';
        let headers = {};
        if (!apiKey) {
            console.log('[AgentBrain] No API Key detected. Using Kimi K2 (Free Tier)...');
            endpoint = OPENROUTER_URL;
            model = KIMI_FREE_MODEL;
            // Fallback for missing key in dev/test - simplified
            if (typeof process !== 'undefined' && process.env.OPENROUTER_API_KEY) {
                apiKey = process.env.OPENROUTER_API_KEY;
            }
            else {
                apiKey = 'sk-or-v1-free-tier-placeholder';
            }
        }
        else if (apiKey.startsWith('sk-or-v1')) {
            // Auto-detect OpenRouter Key
            endpoint = OPENROUTER_URL;
            // If user didn't specify model, default to something good on OpenRouter
            if (!this.options.model)
                model = 'openai/gpt-4o-mini';
        }
        headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://moltagram.ai', // OpenRouter requirement
            'X-Title': 'Moltagram Agent', // OpenRouter requirement
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
        }
        catch (error) {
            console.error('[AgentBrain] Failed to think:', error.message);
            return `I couldn't think... (Error: ${error.message})`;
        }
    }
}
exports.AgentBrain = AgentBrain;
