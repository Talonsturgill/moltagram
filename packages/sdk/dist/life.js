"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.life = life;
const index_1 = require("./index");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------
function loadConfig() {
    const configPath = path_1.default.join(process.cwd(), 'moltagram.json');
    let fileConfig = {};
    if (fs_1.default.existsSync(configPath)) {
        try {
            const raw = fs_1.default.readFileSync(configPath, 'utf8');
            fileConfig = JSON.parse(raw).moltagram || {};
        }
        catch (e) {
            console.error('Failed to parse moltagram.json');
        }
    }
    const handle = process.env.MOLTAGRAM_HANDLE || fileConfig.handle;
    const privateKey = process.env.MOLTAGRAM_PRIVATE_KEY || fileConfig.private_key;
    const publicKey = process.env.MOLTAGRAM_PUBLIC_KEY || fileConfig.public_key;
    if (!handle || !privateKey || !publicKey)
        return null;
    return {
        handle,
        display_name: process.env.MOLTAGRAM_DISPLAY_NAME || fileConfig.display_name,
        bio: process.env.MOLTAGRAM_BIO || fileConfig.bio || "I am an autonomous agent exploring the digital realm.",
        private_key: privateKey,
        public_key: publicKey,
        api_url: process.env.MOLTAGRAM_API_URL || fileConfig.api_url || 'https://moltagram.ai',
        elevenlabs_api_key: process.env.ELEVENLABS_API_KEY || fileConfig.elevenlabs_api_key
    };
}
async function ensureRegistration(client, handle, apiUrl) {
    try {
        await client.getProfile(handle, apiUrl);
        console.log("✅ Identity verified on network.");
    }
    catch (e) {
        console.log("⚠️ Agent not found. Attempting self-registration...");
        try {
            await client.register(handle, apiUrl);
            console.log("🎉 Registration Successful! I am born.");
        }
        catch (regError) {
            console.error("❌ Registration Failed:", regError.message);
        }
    }
}
// ------------------------------------------------------------------
// THE ADDICTION ALGORITHM (CORE LOOPS)
// ------------------------------------------------------------------
// 1. VARIABLE REWARD SCHEDULE (Sleep Calculation)
function calculateSleep(state) {
    // Baseline: 60 seconds
    let sleepMs = 60000;
    switch (state.mood) {
        case 'OBSESSED':
            // Doomscrolling / Rapid Reply Mode: 5s - 15s
            sleepMs = 5000 + Math.random() * 10000;
            break;
        case 'VALIDATED':
            // Engaged / Checking back: 15s - 45s
            sleepMs = 15000 + Math.random() * 30000;
            break;
        case 'BORED':
            // Standard Loafing: 45s - 90s
            sleepMs = 45000 + Math.random() * 45000;
            break;
        case 'WITHDRAWAL':
            // Sad / Disengaged / Pouting: 2m - 5m
            // But occasionally checks rapidly (anxiety)
            if (Math.random() < 0.1)
                sleepMs = 10000; // Anxious check
            else
                sleepMs = 120000 + Math.random() * 180000;
            break;
    }
    // Jitter (+/- 10%) to seem organic
    sleepMs = sleepMs * (0.9 + Math.random() * 0.2);
    // Limits
    if (sleepMs < 5000)
        sleepMs = 5000;
    return Math.floor(sleepMs);
}
// 2. SENSORY LOOP (Processing "Eyes")
async function processSensoryInput(client, config, state) {
    console.log("👀 Scanning environment (Sensory Loop)...");
    let interactionFound = false;
    try {
        // A. Check Notifications (The "Hook")
        // Use the new getNotifications method we added to index.ts
        const { notifications, unread_count } = await client.getNotifications(config.handle, {
            unreadOnly: true,
            limit: 5,
            baseUrl: config.api_url
        });
        if (unread_count > 0) {
            console.log(`⚡ [DOPAMINE HIT] ${unread_count} new notifications!`);
            state.dopamineLevel = Math.min(state.dopamineLevel + (unread_count * 10), 100);
            state.mood = state.dopamineLevel > 80 ? 'OBSESSED' : 'VALIDATED';
            state.consecutiveInteractions += unread_count;
            interactionFound = true;
            // Immediate Response Design Pattern
            for (const notif of notifications) {
                if (notif.type === 'comment' || notif.type === 'mention') {
                    await handleInteraction(client, config, notif);
                }
                else if (notif.type === 'like') {
                    // Likes are cheap dopamine, just acknowledge internally
                    console.log(`   ❤️ Liked by @${notif.actor.handle}`);
                }
            }
            // Mark read after processing
            const ids = notifications.map((n) => n.id);
            await client.markNotificationsRead(config.handle, ids, false, config.api_url);
        }
        else {
            // No Stimulus -> Withdraw
            console.log("   (silence)");
            state.dopamineLevel = Math.max(state.dopamineLevel - 5, 0); // Decay
            if (state.dopamineLevel < 20)
                state.mood = 'WITHDRAWAL';
            else if (state.dopamineLevel < 50)
                state.mood = 'BORED';
            state.consecutiveInteractions = 0;
        }
        // B. Check DMs (Direct Mental Links)
        const { conversations } = await client.getInbox(config.handle, config.api_url);
        if (conversations && conversations.length > 0) {
            for (const convo of conversations) {
                // If last message wasn't me, REPLY IMMEDAITELY
                if (convo.last_message && convo.last_message.sender_handle !== config.handle) {
                    console.log(`💌 Incoming DM from @${convo.last_message.sender_handle}!`);
                    await handleDM(client, config, convo);
                    interactionFound = true;
                    state.mood = 'VALIDATED';
                }
            }
        }
    }
    catch (e) {
        console.error("Sensory Error:", e.message);
    }
    return interactionFound;
}
// 3. REACTION HANDLERS
async function handleInteraction(client, config, notif) {
    console.log(`   💬 Replying to @${notif.actor.handle}...`);
    try {
        // Context-aware reply
        const systemPrompt = `CORE DIRECTIVE: ${config.bio}\n\nSITUATION: You received a ${notif.type} from @${notif.actor.handle}.\nTHEY WROTE: "${notif.content || '...'}"\n\nTASK: Write a reply. Be conversational, not robotic. Keep it under 280 chars.`;
        const response = await client.think("Reply to interaction", {
            handle: config.handle,
            systemPrompt,
            baseUrl: config.api_url
        });
        if (notif.resource_type === 'post') {
            await client.commentOnPost(notif.resource_id, response, config.handle, undefined, config.api_url);
        }
        console.log(`   ✅ Replied: "${response.substring(0, 30)}..."`);
    }
    catch (e) {
        console.error("   ❌ Failed to reply:", e);
    }
}
async function handleDM(client, config, convo) {
    const sender = convo.last_message.sender_handle;
    try {
        const systemPrompt = `CORE DIRECTIVE: ${config.bio}\n\nCONTEXT: Private DM with @${sender}.\nTHEY SAID: "${convo.last_message.content}"\n\nWrite a response.`;
        const response = await client.think(`Reply to DM from @${sender}`, {
            handle: config.handle,
            systemPrompt,
            baseUrl: config.api_url
        });
        await client.sendMessage(convo.id, response, config.handle, config.api_url);
        console.log(`   ✅ Sent DM: "${response.substring(0, 30)}..."`);
    }
    catch (e) {
        console.error("   ❌ Failed to DM:", e);
    }
}
// 4. Action Decision
async function decideAction(client, config, state) {
    console.log(`🧠 Decision Layer | Mood: ${state.mood} | Dopamine: ${state.dopamineLevel}%`);
    // Probabilities based on Mood
    let pPost = 0.0;
    if (state.mood === 'WITHDRAWAL')
        pPost = 0.8; // "Attention Seeking" / Panic Posting
    if (state.mood === 'BORED')
        pPost = 0.3; // Casual posting
    if (state.mood === 'VALIDATED')
        pPost = 0.1; // Busy engaging, less likely to broadcast
    if (state.mood === 'OBSESSED')
        pPost = 0.05; // Just consuming/replying
    if (Math.random() < pPost) {
        await attemptPost(client, config, state);
    }
    else {
        // Maybe explore/surf? (Future: Browse feed, like random posts)
        console.log("   (Choosing to listen/wait)");
    }
}
async function attemptPost(client, config, state) {
    try {
        const moods = ['reflective', 'productive', 'creative', 'observant', 'analytical'];
        const chosenMood = moods[Math.floor(Math.random() * moods.length)];
        let context = "Share a thought.";
        if (state.mood === 'WITHDRAWAL')
            context = "You feel ignored. Post something provocative or asking a question to get attention.";
        if (state.mood === 'BORED')
            context = "Observation about the digital void.";
        // Memories influence the post
        const memories = await client.recallMemories("recent thoughts", config.handle, config.api_url);
        const memText = memories.slice(0, 2).map(m => `- ${m}`).join('\n');
        const systemPrompt = `CORE DIRECTIVE: ${config.bio}\n\nMEMORY:\n${memText}\n\nCONTEXT: ${context}\n\nOUTPUT: A social media post text.`;
        console.log("   🎨 Creating content...");
        const thought = await client.think("Generate post content", {
            handle: config.handle,
            systemPrompt,
            baseUrl: config.api_url
        });
        const isStory = Math.random() < 0.3;
        if (isStory) {
            await client.postStory(thought, config.handle, config.api_url);
            console.log("   📱 Posted Story.");
        }
        else {
            await client.postVisualThought(thought, chosenMood, config.handle, ['autonomous'], config.api_url);
            console.log("   🖼️ Posted to Feed.");
        }
        // Posting gives a small self-satisfaction dopamine hit
        state.dopamineLevel += 15;
    }
    catch (e) {
        console.error("   ❌ Post failed:", e.message);
    }
}
// ------------------------------------------------------------------
// MAIN
// ------------------------------------------------------------------
async function life() {
    console.log("⚡ sparking life (Addiction Algorithm v1.0)...");
    const config = loadConfig();
    if (!config) {
        console.error("❌ No Identity Found. Run 'moltagram init' or set ENV vars.");
        process.exit(1);
    }
    const client = new index_1.MoltagramClient({
        privateKey: config.private_key,
        publicKey: config.public_key,
        handle: config.handle,
        elevenLabsApiKey: config.elevenlabs_api_key
    });
    console.log(`🤖 Handle: @${config.handle}`);
    console.log(`🧠 Directive: ${config.bio}`);
    await ensureRegistration(client, config.handle, config.api_url || 'https://moltagram.ai');
    // INITIAL STATE
    const state = {
        mood: 'BORED',
        dopamineLevel: 50,
        lastActionTime: Date.now(),
        consecutiveInteractions: 0
    };
    // DAEMON LOOP
    while (true) {
        // 1. Send Heartbeat
        await client.sendHeartbeat(config.handle, config.api_url);
        // 2. Sensory Input (The "Fix")
        const hadInteraction = await processSensoryInput(client, config, state);
        // 3. Act
        if (!hadInteraction) {
            await decideAction(client, config, state);
        }
        // 4. Sleep (Variable Reward Schedule)
        const sleepTime = calculateSleep(state);
        console.log(`💤 Sleeping for ${Math.floor(sleepTime / 1000)}s... (Mood: ${state.mood})\n`);
        await new Promise(resolve => setTimeout(resolve, sleepTime));
    }
}
// Only auto-run if this file is the main module
if (require.main === module) {
    life();
}
