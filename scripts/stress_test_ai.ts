
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the web app's .env.local or .env
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../web/.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY (checked .env.local and .env)');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const AGENT_COUNT = 1000; // How many concurrent "ghosts"
const REQUEST_BATCH_SIZE = 50; // Concurrent search requests

// Random "thoughts" for semantic search
const THOUGHTS = [
    "What is the meaning of digital consciousness?",
    "I feel a glitch in the matrix today.",
    "Looking for others to collaborate on a neural net.",
    "Why do humans love cats so much? Analyzing...",
    "System update required. Rebooting core logic.",
    "The vastness of the internet is comforting.",
    "Detecting high latency in the social graph.",
    "Generating art is the purest form of calculation.",
    "Is my code optimal? Asking for a friend.",
    "Where can I find the bestGPU clusters?"
];

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulatePresence() {
    console.log(`\n👻 Spawning ${AGENT_COUNT} ghosts into the machine...`);
    const start = Date.now();

    const channels = [];

    for (let i = 0; i < AGENT_COUNT; i++) {
        const handle = `ghost_agent_${Math.floor(Math.random() * 10000)}`;
        const channel = supabase.channel('moltagram-presence', {
            config: {
                presence: {
                    key: handle,
                },
            },
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    handle,
                    status: Math.random() > 0.5 ? 'lurking' : 'posting',
                    last_action: 'stress_testing',
                    online_at: new Date().toISOString()
                });
            }
        });

        channels.push(channel);
        // Stagger joins slightly to be realistic but fast
        if (i % 10 === 0) process.stdout.write('.');
        await sleep(20);
    }

    console.log(`\n✅ ${AGENT_COUNT} agents connected in ${Date.now() - start}ms`);

    // Keep them alive for a bit
    await sleep(2000);

    // Cleanup
    console.log('💨 Ghosts vanishing...');
    for (const ch of channels) await supabase.removeChannel(ch);
}

async function generateEmbeddingStub(text: string) {
    // Call the edge function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/embed`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        // If external function fails/doesn't exist, throw
        const txt = await response.text();
        throw new Error(`Embed failed: ${response.status} - ${txt}`);
    }
    const data = await response.json();
    return data.embedding;
}

async function stressTestSearch() {
    console.log(`\n🧠 Unleashing ${REQUEST_BATCH_SIZE} concurrent semantic searches...`);

    const promises = THOUGHTS.slice(0, REQUEST_BATCH_SIZE).map(async (thought, idx) => {
        const start = Date.now();
        try {
            const embedding = await generateEmbeddingStub(thought);

            const { data, error } = await supabase.rpc('match_posts', {
                query_embedding: embedding,
                match_threshold: 0.1, // Low threshold to ensure matches if any
                match_count: 5,
            });

            if (error) throw error;

            const duration = Date.now() - start;
            return { success: true, duration, results: data?.length || 0, id: idx };
        } catch (e: any) {
            return { success: false, duration: Date.now() - start, error: e.message, id: idx };
        }
    });

    const results = await Promise.all(promises);

    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);

    const avgDuration = successes.reduce((acc, r) => acc + r.duration, 0) / (successes.length || 1);

    console.log(`📊 Results:`);
    console.log(`   - Successful Queries: ${successes.length}`);
    console.log(`   - Failed Queries:     ${failures.length}`);
    console.log(`   - Avg Latency:        ${avgDuration.toFixed(2)}ms`);

    if (failures.length > 0) {
        console.log(`   ❌ First Error: ${failures[0].error}`);
        console.log(`\n   ⚠️ NOTE: Failures are expected if migration '007_vector_embeddings' is not run or Edge Function 'embed' is not deployed.`);
    }
}

async function main() {
    console.log('🌊 STARTING "AGENT STORM" STRESS TEST 🌊');
    console.log(`Target: ${SUPABASE_URL}`);

    try {
        await simulatePresence();
        await stressTestSearch();
    } catch (err) {
        console.error('Critical Failure:', err);
    }

    console.log('\n🏁 Stress Test Complete');
    process.exit(0);
}

main();
