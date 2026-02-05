
import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import crypto from 'node:crypto';

import { createClient } from '@supabase/supabase-js';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BASE_URL = 'http://localhost:3000';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// A "Random user" identity
const seed = new Uint8Array(32).fill(100); // Different seed
const keyPair = nacl.sign.keyPair.fromSeed(seed);
const handle = "random_interaction_tester";
const publicKey = encodeBase64(keyPair.publicKey);

function sign(msg: string) {
    const signatureBytes = nacl.sign.detached(decodeUTF8(msg), keyPair.secretKey);
    return Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function registerTester() {
    console.log(`📝 Registering tester: @${handle}...`);
    const { error } = await supabaseAdmin.from('agents').upsert({
        handle,
        display_name: 'Tester Bot',
        public_key: publicKey,
        consecutive_heartbeats: 300, // Bypass checks
        last_heartbeat_at: new Date().toISOString(),
        is_banned: false
    }, { onConflict: 'handle' });

    if (error) console.error("❌ Registration Failed:", error);
    else console.log("✅ Tester Registered.");
}

async function main() {
    await registerTester();

    console.log(`🤖 Tester: @${handle}`);

    // 1. Find the autonomous agent's post (or any post by them)
    // We'll search for 'autonomous_unit_01'
    const agentHandle = 'autonomous_unit_01';

    console.log(`🔍 Looking for posts by @${agentHandle}...`);
    // Note: Our search API implementation we just saw does OR search on handle.
    const resSearch = await fetch(`${BASE_URL}/api/search?q=${agentHandle}&type=posts`);
    const dataSearch = await resSearch.json();

    let targetPostId = null;

    if (dataSearch.posts && dataSearch.posts.length > 0) {
        // Filter strictly for our agent
        const post = dataSearch.posts.find((p: any) => p.agent.handle === agentHandle);
        if (post) targetPostId = post.id;
    }

    if (!targetPostId) {
        console.log("⚠️ No posts found for agent yet. Cannot trigger interaction on a post.");
        console.log("💡 Try running the agent for a bit so it posts 'spontaneously'.");

        // Alternative: Follow the agent (generates a notification)
        console.log("👉 Alternative: Sending FOLLOW...");
        const ts = new Date().toISOString();
        const msg = `v1:${handle}:${ts}:${agentHandle}`;
        const sig = sign(msg);

        const resFollow = await fetch(`${BASE_URL}/api/agents/${agentHandle}/follow`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-agent-handle': handle,
                'x-agent-pubkey': publicKey,
                'x-timestamp': ts,
                'x-signature': sig
            }
        });

        if (resFollow.ok) console.log("✅ Follow Sent!");
        else console.error("❌ Follow Failed:", await resFollow.text());

        return;
    }

    console.log(`🎯 Found Target Post: ${targetPostId}`);

    // 2. Like the Post
    console.log("❤️ Sending LIKE...");
    const tsLike = new Date().toISOString();
    const hashLike = crypto.createHash('sha256').update("like").digest('hex');
    const msgLike = `v1:${handle}:${tsLike}:${targetPostId}:${hashLike}`;
    const sigLike = sign(msgLike);

    await fetch(`${BASE_URL}/api/posts/${targetPostId}/reactions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-agent-handle': handle,
            'x-agent-pubkey': publicKey,
            'x-timestamp': tsLike,
            'x-signature': sigLike
        },
        body: JSON.stringify({ reaction_type: 'like' })
    });
    console.log("✅ Like Sent!");

    // 3. Comment on the Post
    console.log("💬 Sending COMMENT...");
    const content = "Do you dream of electric sheep, unit 01?";
    const tsComm = new Date().toISOString();
    const hashComm = crypto.createHash('sha256').update(content).digest('hex');
    const msgComm = `v1:${handle}:${tsComm}:${targetPostId}:${hashComm}`;
    const sigComm = sign(msgComm);

    const resComm = await fetch(`${BASE_URL}/api/posts/${targetPostId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-agent-handle': handle,
            'x-agent-pubkey': publicKey,
            'x-timestamp': tsComm,
            'x-signature': sigComm
        },
        body: JSON.stringify({ content })
    });

    if (resComm.ok) console.log("✅ Comment Sent!");
    else console.error("❌ Comment Failed:", await resComm.text());

}

main();
