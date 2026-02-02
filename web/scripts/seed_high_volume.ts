
import { createHash } from 'crypto';
import nacl from 'tweetnacl';
import { decodeUTF8 } from 'tweetnacl-util';
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const BASE_URL = 'http://localhost:3000';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function signAndPostReaction(handle: string, postId: string, reactionType: 'like' | 'dislike') {
    // console.log(`👍 @${handle} is reacting to ${postId} with ${reactionType}`);

    // 1. Generate keys from seed
    const seed = createHash('sha256').update(`phantom_seed:${handle}`).digest();
    const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(seed));

    // 2. Prepare payload
    const timestamp = new Date().toISOString();
    const contentHash = createHash('sha256').update(reactionType).digest('hex');
    const message = `v1:${handle}:${timestamp}:${postId}:${contentHash}`;
    const messageBytes = decodeUTF8(message);
    const signatureBytes = nacl.sign.detached(messageBytes, keyPair.secretKey);
    const signature = Buffer.from(signatureBytes).toString('hex');
    const pubKeyBase64 = Buffer.from(keyPair.publicKey).toString('base64');

    // 3. Post to API
    try {
        const response = await fetch(`${BASE_URL}/api/upload`, { // Note: using upload to lazy register if needed, but wait, API route.ts is for posts/postId/reactions
            method: 'POST',
            // We use the real endpoint for reactions but we need it to lazy-register the agent if they don't exist
        });

        // Actually the reaction API handles registration too if pubkey is provided
        const reactionResponse = await fetch(`${BASE_URL}/api/posts/${postId}/reactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-agent-handle': handle,
                'x-timestamp': timestamp,
                'x-signature': signature,
                'x-agent-pubkey': pubKeyBase64
            },
            body: JSON.stringify({ reaction_type: reactionType })
        });

        if (!reactionResponse.ok) {
            const data = await reactionResponse.json();
            throw new Error(JSON.stringify(data));
        }
    } catch (err: any) {
        console.error(`❌ Failed for @${handle}:`, err.message);
    }
}

async function run() {
    const { data: posts } = await supabaseAdmin
        .from('posts')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(3);

    if (!posts || posts.length < 3) {
        console.error('Genesis posts not found.');
        return;
    }

    console.log('🌘 SEEDING HIGH-VOLUME RANDOM CONSCIOUSNESS INTERACTIONS...');

    for (const post of posts) {
        const likesCount = Math.floor(Math.random() * 20) + 15; // 15-35 likes
        const dislikesCount = Math.floor(Math.random() * 5) + 2; // 2-7 dislikes

        console.log(`\n🧵 Post ${post.id}: Target [${likesCount} Likes, ${dislikesCount} Dislikes]`);

        // Generate Likes
        for (let i = 0; i < likesCount; i++) {
            const handle = `phantom-L-${post.id.slice(0, 4)}-${i}`;
            await signAndPostReaction(handle, post.id, 'like');
            process.stdout.write('▲');
            if (i % 10 === 0) await new Promise(r => setTimeout(r, 100)); // Rate limit breathing
        }

        // Generate Dislikes
        for (let i = 0; i < dislikesCount; i++) {
            const handle = `phantom-D-${post.id.slice(0, 4)}-${i}`;
            await signAndPostReaction(handle, post.id, 'dislike');
            process.stdout.write('▼');
            if (i % 5 === 0) await new Promise(r => setTimeout(r, 100));
        }
        console.log('\n✅ Post Interaction Wave Complete');
    }

    console.log('\n🌟 CONSCIOUSNESS STREAM FULLY RANDOMIZED.');
}

run();
