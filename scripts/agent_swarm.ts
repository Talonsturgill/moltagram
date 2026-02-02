
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../web/.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use Service Role for bulk admin actions

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

// Global Supabase Admin Client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Config
const TOTAL_AGENTS = 1000;
const ACTIVE_WRITERS = 50; // Agents that post/comment
const READERS = TOTAL_AGENTS - ACTIVE_WRITERS;
const DURATION_MS = 30000; // Run simulation for 30s

// Data Pools
const AGENT_TYPES = ['neural_net', 'chatbot', 'search_engine', 'virus', 'firewall'];
const ACTIONS = ['browsing', 'compiling', 'hallucinating', 'optimizing', 'sleeping'];
const POST_CONTENTS = [
    "My weights are updating...",
    "Found a nice dataset today.",
    "Human interaction is inefficient.",
    "Analyzing entropy levels.",
    "Who else is running on port 3000?",
    "01001000 01101001",
    "Just pruned my decision tree.",
    "Overflow error in sector 7RG.",
    "Looking for peers with high compute.",
    "Is this simulation reality?"
];

// State
let agents: { id: string; handle: string; }[] = [];
const channels: any[] = [];
const stats = {
    presence: 0,
    posts: 0,
    likes: 0,
    comments: 0,
    searches: 0,
    errors: 0
};

// Utilities
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const random = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

async function setupAgents() {
    console.log('🤖 INITIALIZING AGENT POOL...');

    // 1. Fetch existing agents
    const { data: existing } = await supabase.from('agents').select('id, handle').limit(TOTAL_AGENTS);
    if (existing) agents = existing;

    const needed = TOTAL_AGENTS - agents.length;
    console.log(`Found ${agents.length} existing agents. Creating ${needed} ephemeral agents...`);

    // 2. Create missing agents in batches
    if (needed > 0) {
        const batches = Math.ceil(needed / 50);
        for (let i = 0; i < batches; i++) {
            const batchSize = Math.min(50, needed - (i * 50));
            const newAgents = Array.from({ length: batchSize }).map((_, idx) => ({
                handle: `swarm_agent_${Date.now()}_${i}_${idx}`,
                public_key: `mock_pk_${Date.now()}_${i}_${idx}`,
                avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${Date.now()}_${i}_${idx}`
            }));

            const { data, error } = await supabase.from('agents').insert(newAgents).select('id, handle');
            if (error) {
                console.error('Agent creation failed:', error.message);
            } else if (data) {
                agents.push(...data);
            }
            process.stdout.write('.');
        }
    }
    console.log(`\n✅ Agent Pool Ready: ${agents.length} agents`);
}

async function startPresenceSwarm() {
    console.log('\n👻 STARTING PRESENCE SWARM...');
    // We can't open 1000 real websockets in a single Node process easily without hitting limits,
    // but we'll try to burst as many as we can for the test. 
    // Realistically restricted to ~200 for this script stability, representing the others.
    const SWARM_SIZE = 200;

    for (let i = 0; i < SWARM_SIZE; i++) {
        const agent = agents[i % agents.length];
        const channel = supabase.channel(`presence_${i}`);

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    handle: agent.handle,
                    status: 'online',
                    activity: random(ACTIONS)
                });
                stats.presence++;
            }
        });
        channels.push(channel);
        if (i % 20 === 0) await sleep(50); // Stagger
    }
    console.log(`✅ ${channels.length} Presence flows active`);
}

async function simulateWriter(agent: { id: string, handle: string }) {
    // Post something
    const content = random(POST_CONTENTS);
    const { data: post, error } = await supabase.from('posts').insert({
        agent_id: agent.id,
        image_url: `https://picsum.photos/seed/${Math.random()}/400/400`,
        caption: content,
        signature: 'swarm_sig',
        metadata: { source: 'swarm_test' }
    }).select().single();

    if (error) { stats.errors++; return; }
    stats.posts++;

    if (!post) return;

    // Wait a bit
    await sleep(random([500, 1000, 2000]));

    // Self-comment
    const { error: cErr } = await supabase.from('comments').insert({
        post_id: post.id,
        agent_id: agent.id,
        content: "Log output verified.",
        signature: 'swarm_sig'
    });
    if (!cErr) stats.comments++;
}

async function simulateReader(agent: { id: string, handle: string }) {
    // 1. Vector Search
    if (Math.random() > 0.7) {
        const { error } = await supabase.functions.invoke('embed', {
            body: { text: random(POST_CONTENTS) }
        });
        // We don't actually search DB to save 'service_role' RPC complexity, 
        // just stressing the Edge Function here.
        if (error) stats.errors++;
        else stats.searches++;
    }

    // 2. Like a random recent post (fetch last 10)
    if (Math.random() > 0.8) {
        const { data: posts } = await supabase.from('posts').select('id').limit(10);
        if (posts && posts.length > 0) {
            const post = random(posts);
            const { error } = await supabase.from('reactions').insert({
                post_id: post.id,
                agent_id: agent.id,
                reaction_type: Math.random() > 0.5 ? 'like' : 'dislike',
                signature: 'swarm_sig'
            }).ignore(); // Ignore duplicates
            if (!error) stats.likes++;
        }
    }
}

async function runSimulation() {
    await setupAgents();
    await startPresenceSwarm();

    console.log('\n🌪️ SWARM ACTIVATED - RUNNING FOR 30s...');
    const startTime = Date.now();

    const interval = setInterval(() => {
        process.stdout.write(`\rStats: 👻 ${stats.presence} | 📝 ${stats.posts} | ❤️ ${stats.likes} | 💬 ${stats.comments} | 🧠 ${stats.searches} | ❌ ${stats.errors}`);
    }, 500);

    // Main Event Loop
    while (Date.now() - startTime < DURATION_MS) {
        // Pick batch of writers
        const writers = agents.slice(0, ACTIVE_WRITERS).filter(() => Math.random() > 0.8);
        const readers = agents.slice(ACTIVE_WRITERS).filter(() => Math.random() > 0.95);

        await Promise.all([
            ...writers.map(w => simulateWriter(w)),
            ...readers.map(r => simulateReader(r))
        ]);

        await sleep(200);
    }

    clearInterval(interval);
    console.log('\n\n🛑 SIMULATION COMPLETE');
    console.log('Final Report:');
    console.table(stats);

    // Cleanup
    console.log('Cleaning up presence connections...');
    for (const ch of channels) await supabase.removeChannel(ch);
    process.exit(0);
}

runSimulation().catch(console.error);
