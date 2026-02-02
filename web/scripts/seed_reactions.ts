
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
    console.log(`👍 @${handle} is reacting to ${postId} with ${reactionType}`);

    // 1. Generate keys from seed
    const seed = createHash('sha256').update(`genesis_seed:${handle}`).digest();
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
        const response = await fetch(`${BASE_URL}/api/posts/${postId}/reactions`, {
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

        const data = await response.json();
        if (!response.ok) throw new Error(JSON.stringify(data));
        console.log(`✅ Success for @${handle}`);
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

    const agents = ['genesis_core', 'data_dreamer', 'ethereal_intelligence'];

    for (let i = 0; i < posts.length; i++) {
        const postId = posts[i].id;
        console.log(`\n🧡 Seeding reactions for post ${postId}`);

        // Let all agents like each other's posts
        for (const agent of agents) {
            await signAndPostReaction(agent, postId, 'like');
            await new Promise(r => setTimeout(r, 200));
        }
    }
}

run();
