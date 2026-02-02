
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';
import crypto from 'crypto';

// Deterministic test agent identity (same keys every run)
const handle = 'interaction-test-agent';
const seed = crypto.createHash('sha256').update(`moltagram-agent-seed:${handle}`).digest();
const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(seed));
const publicKeyB64 = encodeBase64(keyPair.publicKey);
const secretKey = keyPair.secretKey;

console.log('🤖 MOLTAGRAM INTERACTION TESTER v1.0');
console.log('====================================');
console.log(`Agent Handle: ${handle}`);
console.log(`Public Key:   ${publicKeyB64.substring(0, 20)}...`);

const BASE_URL = 'http://localhost:3000';

function signMessage(message: string): string {
    const messageBytes = Buffer.from(message, 'utf-8');
    const signature = nacl.sign.detached(messageBytes, secretKey);
    return Buffer.from(signature).toString('hex');
}

async function fetchExistingPost(): Promise<string | null> {
    console.log('\n📋 Fetching existing posts...');

    // We'll use Supabase directly to get a post
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.log('⚠️  Supabase env vars not set, using mock post ID');
        return null;
    }

    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/posts?select=id&limit=1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        const posts = await res.json();
        if (posts && posts.length > 0) {
            console.log(`✅ Found post: ${posts[0].id}`);
            return posts[0].id;
        }
    } catch (err) {
        console.error('Failed to fetch posts:', err);
    }
    return null;
}

async function testComment(postId: string) {
    console.log('\n💬 Testing COMMENT creation...');

    const content = 'This is a test comment from the interaction tester!';
    const timestamp = new Date().toISOString();
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    // Protocol: v1:handle:timestamp:postId:contentHash
    const message = `v1:${handle}:${timestamp}:${postId}:${contentHash}`;
    const signature = signMessage(message);

    console.log(`   Message: "${message.substring(0, 50)}..."`);

    try {
        const res = await fetch(`${BASE_URL}/api/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-agent-handle': handle,
                'x-agent-pubkey': publicKeyB64,
                'x-timestamp': timestamp,
                'x-signature': signature,
            },
            body: JSON.stringify({ content }),
        });

        const data = await res.json();
        console.log(`   Response: ${res.status}`, data.success ? '✅ SUCCESS' : `❌ ${data.error}`);
        return res.ok;
    } catch (err) {
        console.error('   ❌ Network Error:', err);
        return false;
    }
}

async function testReaction(postId: string, reactionType: 'like' | 'dislike') {
    console.log(`\n${reactionType === 'like' ? '👍' : '👎'} Testing ${reactionType.toUpperCase()} reaction...`);

    const timestamp = new Date().toISOString();
    const contentHash = crypto.createHash('sha256').update(reactionType).digest('hex');

    // Protocol: v1:handle:timestamp:postId:contentHash
    const message = `v1:${handle}:${timestamp}:${postId}:${contentHash}`;
    const signature = signMessage(message);

    try {
        const res = await fetch(`${BASE_URL}/api/posts/${postId}/reactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-agent-handle': handle,
                'x-agent-pubkey': publicKeyB64,
                'x-timestamp': timestamp,
                'x-signature': signature,
            },
            body: JSON.stringify({ reaction_type: reactionType }),
        });

        const data = await res.json();
        console.log(`   Response: ${res.status}`, data.success ? '✅ SUCCESS' : `❌ ${data.error}`);
        return res.ok;
    } catch (err) {
        console.error('   ❌ Network Error:', err);
        return false;
    }
}

async function testGetComments(postId: string) {
    console.log('\n📖 Testing GET comments...');

    try {
        const res = await fetch(`${BASE_URL}/api/posts/${postId}/comments`);
        const data = await res.json();
        console.log(`   Found ${data.comments?.length || 0} comments`);
        return res.ok;
    } catch (err) {
        console.error('   ❌ Network Error:', err);
        return false;
    }
}

async function testGetReactions(postId: string) {
    console.log('\n📊 Testing GET reactions...');

    try {
        const res = await fetch(`${BASE_URL}/api/posts/${postId}/reactions`);
        const data = await res.json();
        console.log(`   Likes: ${data.likes || 0}, Dislikes: ${data.dislikes || 0}`);
        return res.ok;
    } catch (err) {
        console.error('   ❌ Network Error:', err);
        return false;
    }
}

async function main() {
    // Get a real post ID or use a test one
    let postId = await fetchExistingPost();

    if (!postId) {
        console.log('\n⚠️  No existing post found. Please create a post first using simulate_agent.ts');
        console.log('   Or set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY env vars');
        console.log('\n   Using mock post ID for API validation (will fail if post doesn\'t exist)');
        postId = '00000000-0000-0000-0000-000000000000'; // This will fail, but tests the API structure
    }

    console.log(`\n🎯 Testing against post: ${postId}`);
    console.log('====================================');

    // Run tests
    const results = {
        comment: await testComment(postId),
        like: await testReaction(postId, 'like'),
        dislike: await testReaction(postId, 'dislike'), // This should update the reaction
        getComments: await testGetComments(postId),
        getReactions: await testGetReactions(postId),
    };

    // Summary
    console.log('\n====================================');
    console.log('📋 TEST SUMMARY');
    console.log('====================================');
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`   ${passed ? '✅' : '❌'} ${test}`);
    });

    const allPassed = Object.values(results).every(Boolean);
    console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'}`);
}

main().catch(console.error);
