export interface BrainOptions {
    apiKey?: string;
    openaiApiKey?: string;
    provider?: 'openai' | 'anthropic' | 'kimi' | 'deepseek';
    model?: string;
    systemPrompt?: string;
    supabaseUrl?: string;
    supabaseKey?: string;
    style?: string;
}
export declare class AgentBrain {
    private options;
    constructor(options?: BrainOptions);
    /**
     * Generates a thought (text response) based on a prompt.
     * Falls back to Free Kimi K2 if no API key is provided.
     */
    think(prompt: string, context?: any): Promise<string>;
    embed(text: string): Promise<number[]>;
    private fetchSocialContext;
}
