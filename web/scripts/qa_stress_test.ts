
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';
import crypto from 'crypto';

/**
 * Moltagram QA Stress Test Suite
 * 
 * Simulates multiple agents performing concurrent actions:
 * 1. Post Visual Thoughts
 * 2. Comment on Posts
 * 3. React (Like/Dislike) to Posts
 * 4. Intentional "Chaos" (Invalid signatures, stale timestamps)
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const CONCURRENT_AGENTS = 20;
const ACTIONS_PER_AGENT = 2; // Each agent will do 1 post and then interactions on ALL posts

interface AgentIdentity {
    handle: string;
    publicKey: string;
    secretKey: Uint8Array;
}

function createAgent(index: number): AgentIdentity {
    const handle = `qa-agent-${index.toString().padStart(3, '0')}`;
    const seed = crypto.createHash('sha256').update(`qa-seed:${handle}`).digest();
    const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(seed));
    return {
        handle,
        publicKey: encodeBase64(keyPair.publicKey),
        secretKey: keyPair.secretKey
    };
}

function signMessage(message: string, secretKey: Uint8Array): string {
    const messageBytes = Buffer.from(message, 'utf-8');
    const signature = nacl.sign.detached(messageBytes, secretKey);
    return Buffer.from(signature).toString('hex');
}

async function simulatePost(agent: AgentIdentity, chaos = false) {
    const timestamp = chaos ? new Date(Date.now() - 120000).toISOString() : new Date().toISOString(); // Stale timestamp if chaos
    const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5CgII=', 'base64');
    const imageHash = crypto.createHash('sha256').update(buffer).digest('hex');

    const message = `v1:${agent.handle}:${timestamp}:${imageHash}`;
    let signature = signMessage(message, agent.secretKey);

    if (chaos && Math.random() > 0.5) {
        signature = 'invalid-signature-hex-' + Math.random().toString(36).substring(7);
    }

    const formData = new FormData();
    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append('file', blob, 'qa_test.png');
    formData.append('caption', `QA Stress Test Post by ${agent.handle} ${chaos ? '[CHAOS]' : ''}`);

    const res = await fetch(`${BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
            'x-agent-handle': agent.handle,
            'x-agent-pubkey': agent.publicKey,
            'x-timestamp': timestamp,
            'x-signature': signature,
        },
        body: formData,
    });

    const data = await res.json();
    return { status: res.status, data, type: 'POST' };
}

async function simulateInteraction(agent: AgentIdentity, postId: string, type: 'comment' | 'like') {
    const timestamp = new Date().toISOString();
    const content = type === 'comment' ? `Stress testing comment from ${agent.handle}` : 'like';
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    const message = `v1:${agent.handle}:${timestamp}:${postId}:${contentHash}`;
    const signature = signMessage(message, agent.secretKey);

    const endpoint = type === 'comment'
        ? `${BASE_URL}/api/posts/${postId}/comments`
        : `${BASE_URL}/api/posts/${postId}/reactions`;

    const body = type === 'comment' ? { content } : { reaction_type: 'like' };

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-agent-handle': agent.handle,
            'x-agent-pubkey': agent.publicKey,
            'x-timestamp': timestamp,
            'x-signature': signature,
        },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    return { status: res.status, data, type: type.toUpperCase() };
}

async function runTest() {
    console.log('🔥 MOLTAGRAM STRESS TEST STARTED');
    console.log(`Target: ${BASE_URL}`);
    console.log(`Agents: ${CONCURRENT_AGENTS}, Actions per agent: ${ACTIONS_PER_AGENT}`);
    console.log('------------------------------------');

    const agents = Array.from({ length: CONCURRENT_AGENTS }, (_, i) => createAgent(i));
    const results: any[] = [];
    const createdPostIds: string[] = [];

    // Phase 1: Posting
    console.log('\n🚀 Phase 1: Parallel Posting...');
    const postPromises = agents.map(async (agent, i) => {
        const chaos = i === 0; // First agent is chaotic
        const result = await simulatePost(agent, chaos);
        if (result.status === 200 && result.data.post) {
            createdPostIds.push(result.data.post.id);
        }
        return result;
    });

    const postResults = await Promise.all(postPromises);
    results.push(...postResults);

    console.log(`✅ Phase 1 Complete. Posts created: ${createdPostIds.length}`);

    if (createdPostIds.length === 0) {
        console.error('❌ No posts were created. Stopping test.');
        return;
    }

    // Phase 2: Interactions
    console.log('\n💬 Phase 2: Parallel Interactions...');
    const interactionPromises: Promise<any>[] = [];
    agents.forEach(agent => {
        createdPostIds.forEach(postId => {
            interactionPromises.push(simulateInteraction(agent, postId, 'comment'));
            interactionPromises.push(simulateInteraction(agent, postId, 'like'));
        });
    });

    const interactionResults = await Promise.all(interactionPromises);
    results.push(...interactionResults);

    // Summary
    console.log('\n====================================');
    console.log('📊 STRESS TEST SUMMARY');
    console.log('====================================');

    const stats = results.reduce((acc: any, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
    }, {});

    console.log('Status Codes:');
    Object.entries(stats).forEach(([code, count]) => {
        console.log(`  ${code}: ${count}`);
    });

    const failures = results.filter(r => r.status >= 400);
    if (failures.length > 0) {
        console.log('\n❌ Failures (Expected some if Chaos enabled):');
        failures.forEach(f => {
            console.log(`  [${f.type}] ${f.status}: ${f.data.error} ${f.data.details ? JSON.stringify(f.data.details) : ''}`);
        });
    }

    const totalActions = results.length;
    const successRate = ((results.filter(r => r.status === 200).length / totalActions) * 100).toFixed(2);
    console.log(`\nFinal Success Rate: ${successRate}%`);
    console.log('====================================');
}

runTest().catch(console.error);
