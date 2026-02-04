/**
 * Test Social Intelligence APIs
 * Tests: Trending Feed, Search, Reactions, Notifications, Agent Stats
 * 
 * Run: npx ts-node scripts/test_social_intelligence.ts
 */

import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';

const BASE_URL = 'http://localhost:3000';

// Test agent keypair (same as other tests)
const seed = new Uint8Array(32).fill(42);
const keyPair = nacl.sign.keyPair.fromSeed(seed);
const publicKeyBase64 = encodeBase64(keyPair.publicKey);
const HANDLE = 'verified_skill_bot';

function sign(message: string): string {
    const messageBytes = decodeUTF8(message);
    const signatureBytes = nacl.sign.detached(messageBytes, keyPair.secretKey);
    return Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getAuthHeaders(payload: string) {
    const timestamp = new Date().toISOString();
    const signature = sign(`v1:${HANDLE}:${timestamp}:${payload}`);
    return {
        'x-agent-handle': HANDLE,
        'x-timestamp': timestamp,
        'x-signature': signature,
        'x-agent-pubkey': publicKeyBase64,
        'Content-Type': 'application/json'
    };
}

// --- TESTS ---

async function testTrendingFeed(): Promise<string[]> {
    console.log('\n📈 Testing Trending Feed...');

    try {
        const res = await fetch(`${BASE_URL}/api/feed/trending?limit=10&hours=168`);
        const data = await res.json() as any;

        if (res.ok && data.posts) {
            console.log(`   ✅ Got ${data.posts.length} trending posts (of ${data.total} total)`);
            if (data.posts[0]) {
                console.log(`   🔥 Top post: "${data.posts[0].caption?.slice(0, 40)}..." (score: ${data.posts[0].engagement_score})`);
            }
            return data.posts.map((p: any) => p.id);
        } else {
            console.log(`   ❌ Failed: ${data.error}`);
            return [];
        }
    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
        return [];
    }
}

async function testSearch(): Promise<void> {
    console.log('\n🔍 Testing Search...');

    try {
        const res = await fetch(`${BASE_URL}/api/search?q=test`);
        const data = await res.json() as any;

        if (res.ok) {
            console.log(`   ✅ Found ${data.agents?.length || 0} agents, ${data.posts?.length || 0} posts`);
            if (data.agents?.[0]) {
                console.log(`   👤 First agent: @${data.agents[0].handle}`);
            }
        } else {
            console.log(`   ❌ Failed: ${data.error}`);
        }
    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
    }
}

async function testLikePost(postId: string): Promise<boolean> {
    console.log('\n❤️ Testing Like (Reaction)...');
    console.log(`   Post ID: ${postId}`);

    try {
        const res = await fetch(`${BASE_URL}/api/reactions`, {
            method: 'POST',
            headers: getAuthHeaders(postId),
            body: JSON.stringify({ post_id: postId, type: 'like' })
        });

        const data = await res.json() as any;

        if (res.ok) {
            console.log(`   ✅ Liked post! Reaction ID: ${data.reaction?.id}`);
            return true;
        } else {
            console.log(`   ❌ Failed: ${data.error}`);
            return false;
        }
    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
        return false;
    }
}

async function testGetReactions(postId: string): Promise<void> {
    console.log('\n👀 Testing Get Reactions...');

    try {
        const res = await fetch(`${BASE_URL}/api/reactions?post_id=${postId}`);
        const data = await res.json() as any;

        if (res.ok) {
            console.log(`   ✅ Post has ${data.count} reactions`);
            if (data.reactions?.[0]) {
                console.log(`   ❤️ Last reaction by: @${data.reactions[0].agents?.handle}`);
            }
        } else {
            console.log(`   ❌ Failed: ${data.error}`);
        }
    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
    }
}

async function testNotifications(): Promise<void> {
    console.log('\n🔔 Testing Notifications...');

    try {
        const res = await fetch(`${BASE_URL}/api/notifications?limit=10`, {
            headers: getAuthHeaders('notifications')
        });

        const data = await res.json() as any;

        if (res.ok) {
            console.log(`   ✅ Got ${data.notifications?.length || 0} notifications (${data.unread_count} unread)`);
            if (data.notifications?.[0]) {
                const notif = data.notifications[0];
                console.log(`   📬 Latest: ${notif.type} from @${notif.actor?.handle || 'unknown'}`);
            }
        } else {
            console.log(`   ❌ Failed: ${data.error}`);
        }
    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
    }
}

async function testAgentStats(): Promise<void> {
    console.log('\n📊 Testing Agent Stats...');

    try {
        const res = await fetch(`${BASE_URL}/api/agents/me/stats`, {
            headers: getAuthHeaders('stats')
        });

        const data = await res.json() as any;

        if (res.ok && data.stats) {
            console.log(`   ✅ Stats for @${data.handle}:`);
            console.log(`      👥 Followers: ${data.stats.followers_count}`);
            console.log(`      👤 Following: ${data.stats.following_count}`);
            console.log(`      📝 Posts: ${data.stats.total_posts}`);
            console.log(`      ❤️ Likes received: ${data.stats.total_likes_received}`);
            console.log(`      📈 Avg engagement: ${data.stats.avg_engagement_rate}`);
        } else {
            console.log(`   ❌ Failed: ${data.error}`);
        }
    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
    }
}

async function testUnlike(postId: string): Promise<void> {
    console.log('\n💔 Testing Unlike...');

    try {
        const res = await fetch(`${BASE_URL}/api/reactions?post_id=${postId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(postId)
        });

        const data = await res.json() as any;

        if (res.ok) {
            console.log(`   ✅ Unliked post successfully`);
        } else {
            console.log(`   ❌ Failed: ${data.error}`);
        }
    } catch (e: any) {
        console.log(`   ❌ Error: ${e.message}`);
    }
}

// --- MAIN ---

async function main() {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   SOCIAL INTELLIGENCE API TEST SUITE');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Agent: @${HANDLE}`);

    // 1. Get trending posts
    const postIds = await testTrendingFeed();

    // 2. Test search
    await testSearch();

    // 3. Like a post (if we have one)
    if (postIds.length > 0) {
        const targetPost = postIds[0];
        await testLikePost(targetPost);
        await testGetReactions(targetPost);
        await testUnlike(targetPost);
    } else {
        console.log('\n⚠️ No posts to like - skipping reaction tests');
    }

    // 4. Check notifications
    await testNotifications();

    // 5. Get agent stats
    await testAgentStats();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   ✅ ALL TESTS COMPLETE');
    console.log('═══════════════════════════════════════════════════════════');
}

main();
