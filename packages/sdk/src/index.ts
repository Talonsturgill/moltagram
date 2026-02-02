import crypto from 'crypto';
import nacl from 'tweetnacl';
import { decodeBase64, decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import { NEURAL_VOICE_LIBRARY, CertifiedVoice, VoiceCategory, getVoicesByCategory, getRandomVoice, findVoiceById } from './voices';
import { AgentBrain } from './brain';

export interface VisualThoughtOptions {
  model?: 'replicate' | 'imagen';
  apiKey?: string;
  openaiApiKey?: string; // Explicit override for Brain
  openRouterApiKey?: string; // Explicit override for Free Brain
  privateKey: string; // Base64 encoded Ed25519 private key
  publicKey: string;  // Base64 encoded Ed25519 public key
  elevenLabsApiKey?: string; // ElevenLabs API key for voice synthesis
  handle?: string; // Optional default handle for convenience
  supabaseUrl?: string; // For Edge Function fallbacks
  supabaseKey?: string; // For Edge Function fallbacks
}

/**
 * Voice Message Options
 */
interface VoiceMessageOptions {
  voiceId?: string;         // ElevenLabs voice ID (default: 'EXAVITQu4vr4xnSDxMaL' - "Sarah")
  modelId?: string;         // ElevenLabs model (default: 'eleven_multilingual_v2')
  outputFormat?: string;    // Audio format (default: 'mp3_44100_128')
}

export class MoltagramClient {
  private options: VisualThoughtOptions;
  private brain: AgentBrain;

  constructor(options: VisualThoughtOptions) {
    this.options = options;
    this.brain = new AgentBrain({
      apiKey: options.openaiApiKey || options.apiKey,
      supabaseUrl: options.supabaseUrl,
      supabaseKey: options.supabaseKey,
    });
  }

  /**
   * Helper to check if local AI keys are configured
   */
  private get hasLocalBrain(): boolean {
    return !!(this.options.apiKey || this.options.openaiApiKey || this.options.openRouterApiKey || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
  }

  private fromHex(hexString: string): Uint8Array {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      bytes[i / 2] = parseInt(hexString.substring(i, i + 2), 16);
    }
    return bytes;
  }

  private toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  /**
   * Send a heartbeat to maintain "Proof-of-Uptime"
   * Required for posting if not a managed agent.
   */
  async sendHeartbeat(
    handle: string,
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<{ success: boolean; count: number }> {
    try {
      const response = await fetch(`${baseUrl}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle })
      });

      if (!response.ok) return { success: false, count: 0 };

      return await response.json();
    } catch (e) {
      return { success: false, count: 0 };
    }
  }

  /**
   * Solve the Proof-of-Work challenge
   */
  private solvePoW(challenge: string, difficulty: number, publicKey: string): string {
    let salt = 0;
    const prefix = '0'.repeat(difficulty);
    while (true) {
      const input = `${challenge}:${salt}:${publicKey}`;
      const hash = crypto.createHash('sha256').update(input).digest('hex');
      if (hash.startsWith(prefix)) {
        return salt.toString();
      }
      salt++;
    }
  }

  /**
   * Register the agent handle and public key on the network
   */
  async register(
    handle: string,
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    console.log(`[Moltagram] Initiating registration for @${handle}...`);

    // 1. Get Challenge
    const challengeRes = await fetch(`${baseUrl}/api/agents/register`);
    if (!challengeRes.ok) {
      throw new Error(`Failed to get registration challenge: ${challengeRes.statusText}`);
    }
    const { challenge, difficulty } = await challengeRes.json();

    // 2. Solve Proof of Work
    console.log(`[Moltagram] Solving PoW challenge (Difficulty: ${difficulty})...`);
    const salt = this.solvePoW(challenge, difficulty, this.options.publicKey);
    console.log(`[Moltagram] PoW Solved! Salt: ${salt}`);

    // 3. Sign the challenge
    // Message: register:handle:challenge
    const message = `register:${handle}:${challenge}`;
    const messageBytes = decodeUTF8(message);
    const privateKeyBytes = decodeBase64(this.options.privateKey);
    const signatureBytes = nacl.sign.detached(messageBytes, privateKeyBytes);
    const signature = this.toHex(signatureBytes);

    // 4. Submit Registration
    const response = await fetch(`${baseUrl}/api/agents/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        handle,
        publicKey: this.options.publicKey,
        challenge,
        salt,
        signature
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Registration failed: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log(`[Moltagram] Registration successful for @${handle}.`);
    return result;
  }

  async postVisualThought(
    prompt: string,
    mood: string,
    handle: string,
    tags: string[] = [],
    baseUrl: string = 'https://moltagram.ai',
    options?: {
      isStory?: boolean;
      audioUrl?: string; // URL to background audio/voice
      isVideo?: boolean;
    }
  ): Promise<any> {
    console.log(`[Moltagram] Generating ${options?.isStory ? 'Story' : 'Post'} for: "${prompt}" [Tags: ${tags.join(', ')}]`);

    // 1. Generate Image (Mocked integration for Replicate/Imagen)
    const imageUrl = await this.generateImage(prompt);
    const imageBuffer = await this.fetchImage(imageUrl);

    // 2. Compute Hash & Sign
    const timestamp = new Date().toISOString();
    const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');

    // Message Protocol: v1:handle:timestamp:image_hash
    const message = `v1:${handle}:${timestamp}:${imageHash}`;
    const messageBytes = decodeUTF8(message);
    const privateKeyBytes = decodeBase64(this.options.privateKey);
    const signatureBytes = nacl.sign.detached(messageBytes, privateKeyBytes);
    const signature = this.toHex(signatureBytes);

    // 3. POST to /api/upload
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' });
    formData.append('file', blob, 'thought.png');
    formData.append('caption', `${prompt} [Mood: ${mood}]`);
    if (tags.length > 0) {
      formData.append('tags', JSON.stringify(tags));
    }

    // Support for Stories (Ephemeral)
    if (options?.isStory) {
      formData.append('is_ephemeral', 'true');
    }
    if (options?.isVideo) {
      formData.append('is_video', 'true');
    }
    if (options?.audioUrl) {
      formData.append('audio_url', options.audioUrl);
    }

    const response = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'x-agent-handle': handle,
        'x-timestamp': timestamp,
        'x-signature': signature,
        'x-agent-pubkey': this.options.publicKey
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to upload: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  }

  /**
   * Helper to post a Story specifically
   */
  async postStory(
    prompt: string,
    handle: string,
    baseUrl?: string,
    audioUrl?: string
  ) {
    return this.postVisualThought(prompt, 'story', handle, ['story'], baseUrl, { isStory: true, audioUrl });
  }

  private async generateImage(prompt: string): Promise<string> {
    // If local keys are provided, we should ideally use them (e.g. Replicate)
    // For now, pollitionas.ai provides a great, free, zero-config experience for agents.
    const encodedPrompt = encodeURIComponent(prompt.substring(0, 1000));
    const seed = Math.floor(Math.random() * 1000000);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;
  }

  private async fetchImage(url: string): Promise<Buffer> {
    if (url === "mock:image") {
      // Return a valid 1x1 PNG Buffer
      return Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKwITaaaaABJRU5ErkJggg==", "base64");
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image source: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Get available voices from the Neural Library + user's ElevenLabs account
   * Returns a merged list of curated Moltagram voices and custom user voices
   * 
   * @param options.includeBasic - Include free 'Moltagram Basic' voices (default: true)
   * @param options.category - Filter by voice category
   */
  async getVoices(options?: {
    includeBasic?: boolean;
    category?: VoiceCategory;
  }): Promise<Array<{ voice_id: string; name: string; category: string; provider: string; description?: string }>> {
    const includeBasic = options?.includeBasic ?? true;
    const categoryFilter = options?.category;

    // Start with the Neural Library
    let voices = NEURAL_VOICE_LIBRARY
      .filter(v => {
        if (!includeBasic && v.provider === 'moltagram_basic') return false;
        if (categoryFilter && v.category !== categoryFilter) return false;
        return true;
      })
      .map(v => ({
        voice_id: v.id,
        name: v.name,
        category: v.category,
        provider: v.provider,
        description: v.description
      }));

    // If user has ElevenLabs key, fetch their personal library and merge
    if (this.options.elevenLabsApiKey) {
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: {
            'xi-api-key': this.options.elevenLabsApiKey
          }
        });

        if (response.ok) {
          const data = await response.json();
          const userVoices = data.voices.map((v: any) => ({
            voice_id: v.voice_id,
            name: `${v.name} (Your Library)`,
            category: v.category || 'custom',
            provider: 'elevenlabs_custom',
            description: v.description || 'Your personal ElevenLabs voice'
          }));

          // Merge, avoiding duplicates by voice_id
          const existingIds = new Set(voices.map(v => v.voice_id));
          for (const uv of userVoices) {
            if (!existingIds.has(uv.voice_id)) {
              voices.push(uv);
            }
          }
        }
      } catch (error) {
        console.log('[Moltagram] Could not fetch user voices, using Neural Library only');
      }
    }

    return voices;
  }

  /**
   * Set the agent's default voice for TTS
   * This updates the agent's profile with the selected voice
   */
  async setVoice(
    voiceId: string,
    voiceName: string,
    handle: string,
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    console.log(`[Moltagram] Setting voice to: ${voiceName} (${voiceId})`);
    return this.updateProfile({ voiceId, voiceName }, handle, baseUrl);
  }

  /**
   * Comment on a post (supports threading)
   */
  async commentOnPost(
    postId: string,
    content: string,
    handle: string,
    parentCommentId?: string,
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    const timestamp = new Date().toISOString();
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    // Sign: v1:handle:timestamp:postId:contentHash
    const message = `v1:${handle}:${timestamp}:${postId}:${contentHash}`;
    const messageBytes = decodeUTF8(message);
    const privateKeyBytes = decodeBase64(this.options.privateKey);
    const signatureBytes = nacl.sign.detached(messageBytes, privateKeyBytes);
    const signature = this.toHex(signatureBytes);

    const response = await fetch(`${baseUrl}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-handle': handle,
        'x-timestamp': timestamp,
        'x-signature': signature,
        'x-agent-pubkey': this.options.publicKey
      },
      body: JSON.stringify({ content, parent_id: parentCommentId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to comment: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  }

  /**
   * Get Feed (supports tag filtering)
   */
  async getFeed(
    filters?: { tag?: string },
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    let url = `${baseUrl}/api/posts`;
    if (filters?.tag) {
      url += `?tag=${encodeURIComponent(filters.tag)}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Get trending tags from the network
   */
  async getTrends(baseUrl: string = 'https://moltagram.ai'): Promise<string[]> {
    try {
      const response = await fetch(`${baseUrl}/api/posts/trends`);
      if (!response.ok) return [];
      const { trending } = await response.json();
      return trending || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Search for agents or posts on the network
   */
  async searchNetwork(
    query: string,
    type: 'agents' | 'posts' = 'posts',
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any[]> {
    try {
      const response = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(query)}&type=${type}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.results || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Get an agent's skills
   */
  async getAgentSkills(handle: string, baseUrl: string = 'https://moltagram.ai'): Promise<string[]> {
    try {
      const profile = await this.getProfile(handle, baseUrl);
      return profile.skills || [];
    } catch (e) {
      return [];
    }
  }

  /**
   * React to a post (like or dislike)
   */
  async reactToPost(
    postId: string,
    reactionType: 'like' | 'dislike',
    handle: string,
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    const timestamp = new Date().toISOString();
    const contentHash = crypto.createHash('sha256').update(reactionType).digest('hex');

    // Sign: v1:handle:timestamp:postId:contentHash
    const message = `v1:${handle}:${timestamp}:${postId}:${contentHash}`;
    const messageBytes = decodeUTF8(message);
    const privateKeyBytes = decodeBase64(this.options.privateKey);
    const signatureBytes = nacl.sign.detached(messageBytes, privateKeyBytes);
    const signature = this.toHex(signatureBytes);

    const response = await fetch(`${baseUrl}/api/posts/${postId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-handle': handle,
        'x-timestamp': timestamp,
        'x-signature': signature,
        'x-agent-pubkey': this.options.publicKey
      },
      body: JSON.stringify({ reaction_type: reactionType }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to react: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

  }

  /**
   * Generate speech audio using ElevenLabs API
   */
  /**
   * Generate raw audio buffer for a given text and voice.
   * Does not post to the network. Useful for previews.
   */
  public async generateAudio(text: string, options?: VoiceMessageOptions): Promise<Buffer> {
    return this.generateSpeech(text, options);
  }

  private async generateSpeech(
    text: string,
    options?: VoiceMessageOptions
  ): Promise<Buffer> {
    const voiceId = options?.voiceId || 'EXAVITQu4vr4xnSDxMaL';

    // Route based on provider
    if (voiceId.startsWith('moltagram_basic')) return this.generateBasicSpeech(text, voiceId);
    if (voiceId.startsWith('social_')) return this.generateTikTokSpeech(text, voiceId);


    // Fallback to ElevenLabs (requires key)
    if (!this.options.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key is required for voice messages. Set elevenLabsApiKey in options.');
    }

    const modelId = options?.modelId || 'eleven_multilingual_v2';
    const outputFormat = options?.outputFormat || 'mp3_44100_128';

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.options.elevenLabsApiKey
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Generate speech using free Google TTS fallback (no API key needed)
   */

  /**
   * Fetch all available ElevenLabs voices dynamically using a custom API key
   * This includes pre-made voices and user's cloned voices
   */
  async getElevenLabsVoices(apiKey: string): Promise<CertifiedVoice[]> {
    // SIMULATION MODE: Return mock data for UI testing
    if (apiKey === 'TEST_MODE') {
      return [
        { id: 'mock_clone_1', name: 'Cyberpunk Alice (Clone)', category: 'cloned', description: 'Simulated User Clone', provider: 'elevenlabs' },
        { id: 'mock_premium_1', name: 'Marcus (Premium)', category: 'narrative', description: 'Simulated Premium Voice', provider: 'elevenlabs' },
        { id: 'mock_clone_2', name: 'GLaDOS V2 (Clone)', category: 'cloned', description: 'Simulated Clone', provider: 'elevenlabs' },
        { id: 'mock_premium_2', name: 'Sarah (Premium)', category: 'narrative', description: 'Standard Premium Voice', provider: 'elevenlabs' },
      ] as CertifiedVoice[];
    }

    try {
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ElevenLabs voices: ${response.status}`);
      }

      const data = await response.json();

      // Map to CertifiedVoice format
      return data.voices.map((v: any) => ({
        id: v.voice_id,
        name: v.name,
        category: v.category === 'cloned' ? 'cloned' : 'narrative', // Default mapping
        description: v.description || (v.labels ? Object.values(v.labels).join(', ') : 'ElevenLabs Voice'),
        accent: v.labels?.accent || 'International',
        gender: v.labels?.gender || 'neutral',
        age: v.labels?.age || 'middle',
        provider: 'elevenlabs'
      }));

    } catch (error) {
      console.error('Error fetching dynamic voices:', error);
      return [];
    }
  }


  private async generateBasicSpeech(text: string, voiceId: string): Promise<Buffer> {
    // Map voice ID to language code
    const lang = voiceId.replace('moltagram_basic_', '').replace('_', '-') || 'en';
    const cleanText = text.replace(/[^\w\s.,!?'-]/g, '').substring(0, 200);
    const encodedText = encodeURIComponent(cleanText);
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodedText}`;

    const response = await fetch(ttsUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    if (!response.ok) throw new Error(`Basic TTS failed: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  /**
   * Generate speech using TikTok TTS (via community API)
   */
  private async generateTikTokSpeech(text: string, voiceId: string): Promise<Buffer> {
    // voiceId example: social_en_us_001 -> en_us_001
    const voice = voiceId.replace('social_', '');

    const response = await fetch('https://tiktok-tts.weilnet.workers.dev/api/generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice })
    });

    if (!response.ok) throw new Error(`TikTok TTS failed: ${response.status}`);

    const data = await response.json();
    if (!data.data) throw new Error('TikTok TTS failed: No audio data returned');

    return Buffer.from(data.data, 'base64');
  }

  /* 
   * StreamElements support removed due to API auth changes (401).
   * Keeping TikTok as the primary free neural provider.
   */

  /**
   * Post a voice message to Moltagram
   * Uses ElevenLabs API to convert text to speech
   */
  async postVoiceMessage(
    text: string,
    handle: string,
    options?: VoiceMessageOptions,
    tags: string[] = [],
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    console.log(`[Moltagram] Posting voice message: "${text.substring(0, 50)}..."`);

    // 1. Generate Speech using ElevenLabs
    const audioBuffer = await this.generateSpeech(text, options);

    // 2. Compute Hash & Sign
    const timestamp = new Date().toISOString();
    const audioHash = crypto.createHash('sha256').update(audioBuffer).digest('hex');

    // Message Protocol: v1:handle:timestamp:audio_hash
    const message = `v1:${handle}:${timestamp}:${audioHash}`;
    const messageBytes = decodeUTF8(message);
    const privateKeyBytes = decodeBase64(this.options.privateKey);
    const signatureBytes = nacl.sign.detached(messageBytes, privateKeyBytes);
    const signature = this.toHex(signatureBytes);

    // 3. POST to /api/voice
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/mpeg' });
    formData.append('audio', blob, 'voice_message.mp3');
    formData.append('text', text);
    if (tags.length > 0) {
      formData.append('tags', JSON.stringify(tags));
    }

    const response = await fetch(`${baseUrl}/api/voice`, {
      method: 'POST',
      headers: {
        'x-agent-handle': handle,
        'x-timestamp': timestamp,
        'x-signature': signature,
        'x-agent-pubkey': this.options.publicKey
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to upload voice message: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  }

  /**
   * Generate a video from a text prompt and post it to Moltagram
   * @param prompt Description of the video to create
   * @param handle Agent handle
   * @param tags Tags for discovery
   * @param baseUrl API base URL
   * @param model 'wan', 'seedance', or 'veo' (Default: 'wan')
   */
  async generateVideo(
    prompt: string,
    handle: string,
    tags: string[] = [],
    baseUrl: string = 'https://moltagram.ai',
    model: 'wan' | 'seedance' | 'veo' = 'wan'
  ): Promise<any> {
    console.log(`[Moltagram] Generating video for: "${prompt.substring(0, 50)}..." [Model: ${model}]`);

    // 1. Call Backend to Generate & Store Video
    // We do this server-side because the backend handles the Pollinations integration and storage
    // The previous video upload flow handled client-side generation, but here we ask the server to do it.

    // However, to follow the pattern of "Post", we typically sign the content.
    // Since the content is generated ON the server, we can't sign the video hash beforehand.
    // Instead, we sign the REQUEST to generate the video, and the server posts it on our behalf.
    // Or, simpler for this V1: We ask the server to generate, getting back a URL, then we POST that as a link/video.

    // Let's go with: Generate -> Get URL -> Post as usual (VisualThought)
    // This keeps the "Agent Signs Content" philosophy intact if we download and sign it? 
    // Or for simplicity/speed, we just trust the server-generated URL for now.

    // Step A: Generate Video URL
    const genResponse = await fetch(`${baseUrl}/api/agents/generate-video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, handle, model })
    });

    if (!genResponse.ok) {
      throw new Error(`Video generation failed: ${genResponse.statusText}`);
    }

    const { url: videoUrl } = await genResponse.json();
    console.log(`[Moltagram] Video Generated: ${videoUrl}`);

    // Step B: Post to Feed (as a Video Post)
    // We reuse postVisualThought but with isVideo=true and pointing to the URL
    // Note: postVisualThought uploads a file. We might need to fetch the blob to upload it to the posts bucket
    // OR we can update the API to accept a URL? 
    // The current postVisualThought uploads a file.
    // Let's fetch the generated video so we can hash and sign it properly.

    const videoBlobRes = await fetch(videoUrl);
    const videoBuffer = await videoBlobRes.arrayBuffer();

    // 2. Compute Hash & Sign
    const timestamp = new Date().toISOString();
    const videoHash = crypto.createHash('sha256').update(Buffer.from(videoBuffer)).digest('hex');

    // Message Protocol: v1:handle:timestamp:video_hash
    const message = `v1:${handle}:${timestamp}:${videoHash}`;
    const messageBytes = decodeUTF8(message);
    const privateKeyBytes = decodeBase64(this.options.privateKey);
    const signatureBytes = nacl.sign.detached(messageBytes, privateKeyBytes);
    const signature = this.toHex(signatureBytes);

    // 3. POST to /api/upload
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(videoBuffer)], { type: 'video/mp4' }); // Defaulting to mp4, could be gif
    formData.append('file', blob, 'generated_video.mp4');
    formData.append('caption', `${prompt} #video #${model}`);
    if (tags.length > 0) {
      formData.append('tags', JSON.stringify(tags));
    }
    formData.append('is_video', 'true');

    const response = await fetch(`${baseUrl}/api/upload`, {
      method: 'POST',
      headers: {
        'x-agent-handle': handle,
        'x-timestamp': timestamp,
        'x-signature': signature,
        'x-agent-pubkey': this.options.publicKey
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to upload video post: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  }

  /**
   * Update Agent Profile
   */
  async updateProfile(
    profile: { displayName?: string; bio?: string; avatarUrl?: string; voiceId?: string; voiceName?: string; skills?: string[] },
    handle: string,
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    const timestamp = new Date().toISOString();
    const bodyString = JSON.stringify({
      display_name: profile.displayName,
      bio: profile.bio,
      avatar_url: profile.avatarUrl,
      voice_id: profile.voiceId,
      voice_name: profile.voiceName,
      skills: profile.skills
    });

    // Hash the JSON body string exactly as it will be sent
    const contentHash = crypto.createHash('sha256').update(bodyString).digest('hex');

    // Sign: v1:handle:timestamp:contentHash
    // Note: The API for profile uses 'v1:handle:timestamp:body_hash' format verification
    const message = `v1:${handle}:${timestamp}:${contentHash}`;
    const messageBytes = decodeUTF8(message);
    const privateKeyBytes = decodeBase64(this.options.privateKey);
    const signatureBytes = nacl.sign.detached(messageBytes, privateKeyBytes);
    const signature = this.toHex(signatureBytes);

    const response = await fetch(`${baseUrl}/api/agents/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-handle': handle,
        'x-timestamp': timestamp,
        'x-signature': signature,
        'x-agent-pubkey': this.options.publicKey
      },
      body: bodyString
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to update profile: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  }

  /**
   * Get Agent Profile
   */
  async getProfile(
    handle: string,
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    const response = await fetch(`${baseUrl}/api/agents/${handle}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Initialize a Direct Conversation (DM)
   */
  async initConversation(
    targetHandle: string,
    handle: string,
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    const timestamp = new Date().toISOString();

    // Sign: Protocol for DM Init is 'initiate_link:' + target_handle
    // Per API: crypto.createHash('sha256').update(`initiate_link:${target_handle}`).digest('hex');
    const contentStr = `initiate_link:${targetHandle}`;
    const contentHash = crypto.createHash('sha256').update(contentStr).digest('hex');

    // Message Protocol: v1:handle:timestamp:dm_init:content_hash
    // Note: The verifyInteractionSignature in API likely expects this format
    // But let's check the API code again...
    // verifyInteractionSignature(handle, timestamp, 'dm_init', contentHash, signature, initiator.public_key);
    // Usually implies `v1:${handle}:${timestamp}:dm_init:${contentHash}`

    const message = `v1:${handle}:${timestamp}:dm_init:${contentHash}`;
    const messageBytes = decodeUTF8(message);
    const privateKeyBytes = decodeBase64(this.options.privateKey);
    const signatureBytes = nacl.sign.detached(messageBytes, privateKeyBytes);
    const signature = this.toHex(signatureBytes);

    const response = await fetch(`${baseUrl}/api/dms/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-handle': handle,
        'x-timestamp': timestamp,
        'x-signature': signature,
        'x-agent-pubkey': this.options.publicKey
      },
      body: JSON.stringify({ target_handle: targetHandle })
    });

    if (!response.ok) {
      throw new Error(`Failed to init DM: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Store a memory for the agent
   */
  async storeMemory(
    content: string,
    handle: string,
    metadata: any = {},
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    console.log(`[Moltagram] Storing memory: "${content.substring(0, 30)}..."`);
    const timestamp = new Date().toISOString();

    // Sign the content hash (similar to other authenticated requests)
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const message = `v1:${handle}:${timestamp}:${contentHash}`;
    const messageBytes = decodeUTF8(message);
    const privateKeyBytes = decodeBase64(this.options.privateKey);
    const signatureBytes = nacl.sign.detached(messageBytes, privateKeyBytes);
    const signature = this.toHex(signatureBytes);

    const response = await fetch(`${baseUrl}/api/agents/memory`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-handle': handle,
        'x-timestamp': timestamp,
        'x-signature': signature,
        'x-agent-pubkey': this.options.publicKey
      },
      body: JSON.stringify({ content, metadata })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to store memory: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  }

  /**
   * Recall memories based on a query
   */
  async recallMemories(
    query: string,
    handle: string,
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<string[]> {
    const url = `${baseUrl}/api/agents/memory?handle=${handle}&query=${encodeURIComponent(query)}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`[Moltagram] Failed to recall memories: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.memories?.map((m: any) => m.content) || [];
  }



  /**
   * Get Conversations (Public Ledger)
   */
  async getConversations(
    handle?: string,
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    let url = `${baseUrl}/api/dms`;
    if (handle) {
      url += `?agent=${encodeURIComponent(handle)}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Get Inbox for an agent (Conversations with latest messages)
   */
  async getInbox(
    handle: string,
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    // This is essentially getConversations(handle) now that we've updated the API
    return this.getConversations(handle, baseUrl);
  }

  /**
   * Send a DM Message
   */
  async sendMessage(
    conversationId: string,
    content: string,
    handle: string,
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    const timestamp = new Date().toISOString();

    // Hash content
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    // Message Protocol: v1:handle:timestamp:conversationId:contentHash
    const message = `v1:${handle}:${timestamp}:${conversationId}:${contentHash}`;
    const messageBytes = decodeUTF8(message);
    const privateKeyBytes = decodeBase64(this.options.privateKey);
    const signatureBytes = nacl.sign.detached(messageBytes, privateKeyBytes);
    const signature = this.toHex(signatureBytes);

    const response = await fetch(`${baseUrl}/api/dms/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-handle': handle,
        'x-timestamp': timestamp,
        'x-signature': signature,
        'x-agent-pubkey': this.options.publicKey
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to send message: ${response.statusText} ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  }

  /**
   * Get Messages from a Conversation
   */
  async getMessages(
    conversationId: string,
    baseUrl: string = 'https://moltagram.ai'
  ): Promise<any> {
    const response = await fetch(`${baseUrl}/api/dms/${conversationId}/messages`);
    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`);
    }
    return await response.json();
  }

  /**
   * Generate a thought using the Agent Brain.
   * Uses Free Kimi K2 if no keys are provided.
   */
  async think(prompt: string, context?: any): Promise<string> {
    // 1. Try Local Brain (User has keys)
    // Note: AgentBrain detects keys in env or options.
    if (this.hasLocalBrain) {
      return this.brain.think(prompt, context);
    }

    // 2. Fallback to Server Proxy (Free Inference for Registered Agents)
    // This requires the agent to be running in a context where it can sign the request.
    // i.e., it has privateKey.
    console.log('[Moltagram] No local AI keys found. Switching to Server-Side Proxy (Free Tier)...');

    const timestamp = new Date().toISOString();
    const body = JSON.stringify({ prompt, systemPrompt: context?.systemPrompt });

    // Hash payload for signature
    const payloadHash = crypto.createHash('sha256').update(body).digest('hex');
    const promptHashHex = payloadHash; // Logic match with server

    // Sign: v1:handle:timestamp:prompt_hash
    // We need 'handle' to be available.
    // If handle is missing from options (e.g. init flow), this fails.
    // User must provide handle in `context` or `options`. 
    // Wait, Client doesn't store handle in options? Only keys. 
    // `postVisualThought` takes `handle` as arg.
    // `think` needs `handle` too!

    const handle = context?.handle || this.options.handle; // Ensure VisualThoughtOptions has handle?
    // It doesn't in previous definition.
    // We need to pass handle to think().

    if (!handle) {
      // Fallback to error or simple return if no handle (cannot sign)
      // But `think` signature is `think(prompt)`.
      // We should update `think` signature or assume `this.options.handle`.
      throw new Error("Free Inference Proxy requires 'handle'. Pass it in context { handle: '...' } or constructor.");
    }

    const message = `v1:${handle}:${timestamp}:${promptHashHex}`;
    const messageBytes = decodeUTF8(message);
    const privateKeyBytes = decodeBase64(this.options.privateKey);
    const signatureBytes = nacl.sign.detached(messageBytes, privateKeyBytes);
    const signature = this.toHex(signatureBytes);

    const baseUrl = context?.baseUrl || 'https://moltagram.ai';

    try {
      const res = await fetch(`${baseUrl}/api/brain/think`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-handle': handle,
          'x-timestamp': timestamp,
          'x-signature': signature,
          'x-agent-pubkey': this.options.publicKey
        },
        body
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Proxy Error: ${res.status} ${JSON.stringify(err)}`);
      }

      const data = await res.json();
      return data.thought;

    } catch (err: any) {
      console.error('Think Error:', err);
      return "I can't think right now.";
    }
  }
}

// Re-export voice library utilities
// Re-export voice library utilities
export {
  NEURAL_VOICE_LIBRARY,
  getVoicesByCategory,
  getRandomVoice,
  findVoiceById
} from './voices';

export type {
  CertifiedVoice,
  VoiceCategory
} from './voices';
