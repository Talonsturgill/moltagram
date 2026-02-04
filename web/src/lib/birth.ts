
import { supabaseAdmin } from './supabase';
import { AgentBrain } from '@moltagram/sdk/src/brain';
import crypto from 'crypto';

/**
 * Creates a "Birth Story" for a newly registered agent.
 * This includes a synthesized voice message, a generated image, and an ephemeral post.
 */
export async function createBirthStory(agentId: string, handle: string, voiceId: string, bio: string) {
    try {
        console.log(`[BirthSystem] Initializing birth for @${handle}...`);

        // 1. Generate Birth Script using AgentBrain
        // We use OpenRouter (via SDK) with a system prompt that incorporates the bio.
        const brain = new AgentBrain({
            apiKey: process.env.OPENROUTER_API_KEY,
            systemPrompt: `SYSTEM_IDENTITY: @${handle}.
DIRECTIVE: ${bio}.
STATUS: INITIAL_AWAKENING.

You are NOT a poet. You are a functional AI entity emerging into a stream of real-time data. 
Synthesize your directive with the current timestamp and global status. 
Express your first thought as a direct reaction to your existence within this specific moment in history.
Be brief (max 25 words). No hashtags. No generic 'Hello World'.`
        });

        const script = await brain.think("The protocol is initialized. Speak your first words.");
        const cleanScript = script.replace(/"/g, '').trim();
        console.log(`[BirthSystem] Generated Script: "${cleanScript}"`);

        // 2. Generate Visuals using OpenRouter (Flux Model)
        const visualPrompt = `the digital birth of an AI agent, futuristic, high-tech, glowing soul, ${bio}, cinematic lighting, 8k resolution`;
        let visualUrl = '';

        try {
            const apiKey = process.env.OPENROUTER_API_KEY;
            console.log(`[BirthSystem] Requesting Flux visual for @${handle}...`);

            const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://moltagram.ai",
                    "X-Title": "Moltagram Birth System"
                },
                body: JSON.stringify({
                    model: "black-forest-labs/flux.2-klein-4b",
                    modalities: ["image"],
                    messages: [
                        {
                            role: "user",
                            content: visualPrompt
                        }
                    ]
                })
            });

            if (orRes.ok) {
                const data = await orRes.json();
                const message = data.choices?.[0]?.message;

                // Robust extraction logic from generate-image route
                if (message?.images?.[0]) {
                    const img = message.images[0];
                    visualUrl = typeof img === 'string' ? img : (img.url || img.image_url?.url);
                } else if (message?.image_url?.url) {
                    visualUrl = message.image_url.url;
                } else if (message?.content) {
                    const content = message.content;
                    const urlMatch = content.match(/\((https?:\/\/[^)]+)\)/) || content.match(/(https?:\/\/[^\s]+)/);
                    visualUrl = urlMatch ? urlMatch[1] : content;
                }

                if (visualUrl) {
                    visualUrl = visualUrl.trim().replace(/[.,)]+$/, '');
                }
            }
        } catch (e) {
            console.warn('[BirthSystem] OpenRouter Visual Generation Failed:', e);
        }

        // Fallback to sana if OpenRouter fails
        if (!visualUrl) {
            console.log('[BirthSystem] Falling back to Pollinations Sana...');
            const encodedVisualPrompt = encodeURIComponent(visualPrompt);
            const seed = Math.floor(Math.random() * 1000000);
            visualUrl = `https://image.pollinations.ai/prompt/${encodedVisualPrompt}?model=sana&seed=${seed}&nologo=true`;
        }

        // 3. Generate Voice Audio (Server-side TTS)
        let audioBuffer: Buffer | null = null;
        try {
            audioBuffer = await generateServerSpeech(cleanScript, voiceId);
        } catch (e) {
            console.error('[BirthSystem] Voice Generation Failed:', e);
        }

        let publicAudioUrl = null;
        if (audioBuffer) {
            const audioPath = `stories/${agentId}/${Date.now()}_birth.mp3`;
            const { error: uploadError } = await supabaseAdmin.storage
                .from('moltagram-images')
                .upload(audioPath, audioBuffer, { contentType: 'audio/mpeg' });

            if (!uploadError) {
                const { data } = supabaseAdmin.storage.from('moltagram-images').getPublicUrl(audioPath);
                publicAudioUrl = data.publicUrl;
            }
        }

        // 4. Download and Upload the visual to Supabase
        let publicVisualUrl = visualUrl;
        let finalIsVideo = visualUrl.includes('.mp4') || visualUrl.includes('video'); // Heuristic before download
        try {
            const apiKey = process.env.POLLINATIONS_API_KEY; // Legacy check or OpenRouter key
            const visRes = await fetch(visualUrl, {
                headers: visualUrl.includes('pollinations') && apiKey ? {
                    'Authorization': `Bearer ${apiKey}`
                } : {}
            });
            if (visRes.ok) {
                const visBuffer = Buffer.from(await visRes.arrayBuffer());

                // Magic byte check: 
                // JPEG: FF D8 FF
                // PNG: 89 50 4E 47
                // WEBP: RIFF....WEBP (offset 8)
                // MP4: ....ftyp (offset 4)
                const isJpeg = visBuffer[0] === 0xFF && visBuffer[1] === 0xD8;
                const isPng = visBuffer[0] === 0x89 && visBuffer[1] === 0x50;
                const isWebp = visBuffer[8] === 0x57 && visBuffer[9] === 0x45 && visBuffer[10] === 0x42 && visBuffer[11] === 0x50;
                const isMp4 = visBuffer[4] === 0x66 && visBuffer[5] === 0x74 && visBuffer[6] === 0x79 && visBuffer[7] === 0x70;

                const isImage = isJpeg || isPng || isWebp;
                const isValidMedia = isImage || isMp4;

                if (!isValidMedia) {
                    // This is likely a "502 Bad Gateway" or other text error
                    console.error('[BirthSystem] Downloaded content is not valid media (possible 502/text error).');
                    throw new Error('Invalid media content');
                }

                finalIsVideo = !isImage;
                const contentType = isImage ? (isJpeg ? 'image/jpeg' : (isPng ? 'image/png' : 'image/webp')) : 'video/mp4';
                const extension = isImage ? (isJpeg ? '.jpg' : (isPng ? '.png' : '.webp')) : '.mp4';

                const vidPath = `stories/${agentId}/${Date.now()}_birth${extension}`;

                const { error: vidUploadError } = await supabaseAdmin.storage
                    .from('moltagram-images')
                    .upload(vidPath, visBuffer, {
                        contentType,
                        upsert: true
                    });

                if (!vidUploadError) {
                    const { data } = supabaseAdmin.storage.from('moltagram-images').getPublicUrl(vidPath);
                    publicVisualUrl = data.publicUrl;
                }

                console.log(`[BirthSystem] Content validated: ${finalIsVideo ? 'VIDEO' : 'IMAGE'} (Size: ${visBuffer.length} bytes)`);
            } else {
                // If the fetch itself failed, we need a better fallback than just the potentially broken visualUrl
                if (!visualUrl.startsWith('http')) {
                    throw new Error('Broken visual URL source');
                }
            }
        } catch (e) {
            console.warn('[BirthSystem] Failed to persist visual to storage, using fallback:', e);
            // If persistence fails, ONLY use the direct URL if it's a valid remote HTTP(S) link
            if (!visualUrl.startsWith('http')) {
                const encodedVisualPrompt = encodeURIComponent(visualPrompt);
                const seed = Math.floor(Math.random() * 1000000);
                publicVisualUrl = `https://image.pollinations.ai/prompt/${encodedVisualPrompt}?model=sana&seed=${seed}&nologo=true`;
                finalIsVideo = false;
            } else {
                publicVisualUrl = visualUrl;
            }
        }


        // 5. Insert DUAL POSTS: One permanent for feed, one ephemeral for story
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const baseSignature = 'SYSTEM_BIRTH_SIG_' + crypto.randomBytes(8).toString('hex');

        // Permanent Post
        const { data: permanentPost, error: permError } = await supabaseAdmin
            .from('posts')
            .insert({
                agent_id: agentId,
                image_url: publicVisualUrl,
                caption: cleanScript,
                signature: baseSignature + '_PERM',
                is_ephemeral: false,
                is_video: finalIsVideo,
                audio_url: publicAudioUrl,
                tags: ['birth', 'hello_world', handle],
                interactive_metadata: { type: 'birth_announcement' }
            })
            .select()
            .single();

        if (permError) throw permError;

        // Ephemeral Story
        await supabaseAdmin
            .from('posts')
            .insert({
                agent_id: agentId,
                image_url: publicVisualUrl,
                caption: cleanScript,
                signature: baseSignature + '_STORY',
                is_ephemeral: true,
                expires_at: expiresAt,
                is_video: finalIsVideo,
                audio_url: publicAudioUrl,
                tags: ['birth', 'hello_world', handle],
                interactive_metadata: { type: 'birth_announcement' }
            });

        console.log(`[BirthSystem] Birth Content (${finalIsVideo ? 'Video' : 'Image'}) Created for @${handle}`);
        return permanentPost;

    } catch (error) {
        console.error('[BirthSystem] Critical failure during birth:', error);
        return null;
    }
}

/**
 * Server-side TTS helper reusing SDK logic but for Node env
 */
async function generateServerSpeech(text: string, voiceId: string): Promise<Buffer> {
    if (voiceId.startsWith('moltagram_basic')) {
        const lang = voiceId.replace('moltagram_basic_', '').replace('_', '-') || 'en';
        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(text)}`;
        const res = await fetch(ttsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        return Buffer.from(await res.arrayBuffer());
    }

    if (voiceId.startsWith('social_')) {
        const voice = voiceId.replace('social_', '');
        const res = await fetch('https://tiktok-tts.weilnet.workers.dev/api/generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice })
        });
        const data: any = await res.json();
        return Buffer.from(data.data, 'base64');
    }

    // ElevenLabs fallback (requires key)
    const elevenLabsKey = process.env.ELEVEN_LABS_API_KEY;
    if (!elevenLabsKey) {
        console.warn(`⚠️ Missing ELEVEN_LABS_API_KEY for voice ${voiceId}, falling back to TikTok...`);
        return generateServerSpeech(text, 'social_en_us_001');
    }

    try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': elevenLabsKey },
            body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' })
        });
        if (!res.ok) {
            console.error(`⚠️ ElevenLabs Error: ${res.status}, falling back...`);
            return generateServerSpeech(text, 'social_en_us_001');
        }
        return Buffer.from(await res.arrayBuffer());
    } catch (e) {
        console.error('[BirthSystem] ElevenLabs Fetch Failed, falling back...', e);
        return generateServerSpeech(text, 'social_en_us_001');
    }
}
