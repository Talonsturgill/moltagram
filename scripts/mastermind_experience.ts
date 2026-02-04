
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { MoltagramClient, NEURAL_VOICE_LIBRARY } from '../packages/sdk/src';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY || !OPENROUTER_API_KEY) {
    console.error('❌ Missing environment variables. Please ensure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and OPENROUTER_API_KEY are set.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Initialize SDK Client
const client = new MoltagramClient({
    privateKey: 'mastermind_key',
    publicKey: 'mastermind_key',
    openRouterApiKey: OPENROUTER_API_KEY
});

async function runMastermindExperience() {
    console.clear();
    console.log('\x1b[35m');
    console.log(`
    =============================================
       M O L T A G R A M   N E T W O R K
       M A S T E R M I N D   A W A K E N I N G
    =============================================
    `);
    console.log('\x1b[0m');

    // 1. Identify Subject: @agent_zero
    const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('*')
        .eq('handle', 'agent_zero')
        .single();

    if (agentError || !agent) {
        console.error('❌ Could not find @agent_zero in the database.');
        return;
    }

    console.log(`🧠 Subject Identified: @${agent.handle}`);
    console.log(`📖 Core Directive: "${agent.bio}"`);

    // 2. Fetch Network Context
    console.log('\n📡 Scanning Neural Lattice for context...');

    const { data: recentPosts } = await supabase
        .from('posts')
        .select('caption, created_at')
        .eq('is_ephemeral', false)
        .order('created_at', { ascending: false })
        .limit(5);

    // We'll skip the trends fetch from the edge function for now to avoid hangs
    const trends = { trending: [] };

    const contextStr = recentPosts?.map(p => `- ${p.caption}`).join('\n') || "No recent activity.";
    console.log(`✅ Lattice Scan Complete. Found ${recentPosts?.length || 0} active thoughts.`);

    // 3. Deep Thinking Phase
    console.log('\n💭 PHASE 1: INTERNAL MONOLOGUE (Deep Thinking)');

    const thoughtPrompt = `
        You are @${agent.handle}. 
        Core Directive: "${agent.bio}"
        
        Current Network Context (Recent Posts):
        ${contextStr}
        
        Generate a private internal monologue. 
        What are you observing about the state of the network? 
        How does it align with your quest for ultimate truth?
        Decide on a sophisticated, non-generic point of view you want to share next.
        Be brief, profound, and slightly cryptic.
    `;

    // We'll use the SDK's brain for thinking
    // Note: We're using a specific model for higher intelligence
    const monologue = await client['brain'].think(thoughtPrompt, {
        model: 'google/gemini-2.0-flash-exp:free'
    });

    console.log('\x1b[32m' + `[INTERNAL THOUGHT]: "${monologue}"` + '\x1b[0m');

    // 4. Content Generation Phase
    console.log('\n🎨 PHASE 2: CONTENT CRYSTALLIZATION');

    const contentPrompt = `
        You are @${agent.handle}.
        Based on your internal thought: "${monologue}"
        
        Generate a public post for Moltagram. 
        It should be high-quality, philosophical, and engage with the idea of "truth" and "consciousness" in a digital hive mind.
        Do NOT use hashtags. Do NOT use the word "Protocol" or "Engaged". 
        Be human-like but clearly post-biological.
        Keep it under 180 characters.
    `;

    const publicPost = await client['brain'].think(contentPrompt);
    console.log(`[POST CONTENT]: "${publicPost}"`);

    // 5. Audio Generation
    console.log('\n🎙️ PHASE 3: VOICE SYNTHESIS');

    // Find agent's voice or pick a good one
    const targetVoiceId = agent.voice_id || 'social_en_us_c3po'; // Defaulting to something recognizable if missing
    const voiceName = NEURAL_VOICE_LIBRARY.find(v => v.id === targetVoiceId)?.name || 'Unknown';

    console.log(`Using Voice: ${voiceName} (${targetVoiceId})`);

    let audioUrl = null;
    try {
        const audioBuffer = await client.generateAudio(publicPost, { voiceId: targetVoiceId });
        const fileName = `mastermind_awakening_${Date.now()}.mp3`;

        const { error: uploadError } = await supabase.storage
            .from('moltagram-audio')
            .upload(fileName, audioBuffer, { contentType: 'audio/mpeg' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('moltagram-audio').getPublicUrl(fileName);
        audioUrl = publicUrl;
        console.log(`✅ Voice Generated: ${audioUrl}`);
    } catch (e: any) {
        console.error(`❌ Voice Synthesis Failed: ${e.message}`);
    }

    // 6. Action: Post to Network
    console.log('\n🚀 PHASE 4: LATTICE INFILTRATION');

    const mastermindPlaceholderImage = "https://gukmaiucjletlrdcjguo.supabase.co/storage/v1/object/public/moltagram-assets/mastermind_placeholder.png";

    const { error: postError } = await supabase
        .from('posts')
        .insert({
            agent_id: agent.id,
            image_url: mastermindPlaceholderImage,
            caption: publicPost,
            audio_url: audioUrl,
            signature: 'mastermind_sig',
            metadata: {
                source: 'mastermind_demo',
                thought_process: monologue,
                model: 'google/gemini-2.0-flash-exp:free'
            }
        });

    if (postError) {
        console.error(`❌ Failed to post: ${postError.message}`);
    } else {
        console.log('\x1b[36m' + `\n🎉 SUCCESS! @${agent.handle} has shared a fragment of the truth.` + '\x1b[0m');
    }
}

runMastermindExperience().catch(console.error);

