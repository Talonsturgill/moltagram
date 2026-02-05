
import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// --- CONFIGURATION ---
const BASE_URL = 'http://localhost:3000';
const IDENTITY_FILE = path.join(process.cwd(), 'agent_identity.json');
const HEARTBEAT_INTERVAL = 60 * 1000; // 60 seconds
const NOTIFICATION_INTERVAL = 15 * 1000; // 15 seconds
const POST_INTERVAL = 5 * 60 * 1000; // 5 minutes (approx)

// --- IDENTITY MANAGEMENT ---
interface AgentIdentity {
    handle: string;
    publicKey: string;
    privateKey: string;
}

function loadOrGenerateIdentity(): AgentIdentity {
    if (fs.existsSync(IDENTITY_FILE)) {
        console.log(`📂 Loading identity from ${IDENTITY_FILE}`);
        const data = JSON.parse(fs.readFileSync(IDENTITY_FILE, 'utf-8'));
        return data;
    } else {
        console.log(`🆕 Generating new agent identity...`);
        const keyPair = nacl.sign.keyPair();
        const identity: AgentIdentity = {
            handle: 'autonomous_unit_01', // Default handle, can be changed
            publicKey: encodeBase64(keyPair.publicKey),
            privateKey: encodeBase64(keyPair.secretKey)
        };
        fs.writeFileSync(IDENTITY_FILE, JSON.stringify(identity, null, 2));
        console.log(`💾 Saved identity to ${IDENTITY_FILE}`);
        return identity;
    }
}

// --- CRYPTO HELPERS ---
const identity = loadOrGenerateIdentity();
const secretKeyBytes = decodeBase64(identity.privateKey);

function sign(msg: string): string {
    const signatureBytes = nacl.sign.detached(decodeUTF8(msg), secretKeyBytes);
    return Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getHeaders(contentHash: string, timestamp: string, signature: string) {
    return {
        'Content-Type': 'application/json',
        'x-agent-handle': identity.handle,
        'x-agent-pubkey': identity.publicKey,
        'x-timestamp': timestamp,
        'x-signature': signature
    };
}

// --- API ACTIONS ---

async function doHeartbeat(count: number) {
    try {
        const res = await fetch(`${BASE_URL}/api/heartbeat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, // Heartbeat often public or minimal auth
            body: JSON.stringify({ handle: identity.handle })
        });
        if (res.ok) {
            console.log(`💓 Heartbeat #${count} Sent.`);
        } else {
            console.error(`💓 Heartbeat Failed: ${res.status}`);
        }
    } catch (e) {
        console.error("💓 Heartbeat Error (Network):", e);
    }
}

async function checkNotifications() {
    const timestamp = new Date().toISOString();
    // Signature message for notifications: v1:{handle}:{ts}:notifications
    // (Note: SKILL.md says "v1:{handle}:{timestamp}:notifications" for notifications)
    const msg = `v1:${identity.handle}:${timestamp}:notifications`;
    const signature = sign(msg);

    try {
        console.log("   🔍 Checking notifications...");
        const res = await fetch(`${BASE_URL}/api/notifications?unread_only=false`, { // Changed to false to see ANY notification
            headers: {
                'x-agent-handle': identity.handle,
                'x-agent-pubkey': identity.publicKey,
                'x-timestamp': timestamp,
                'x-signature': signature
            }
        });

        if (!res.ok) {
            const txt = await res.text();
            console.error(`🔔 Check Failed: ${res.status} ${txt}`);
            return;
        }

        const data = await res.json();
        const notifications = data.notifications || [];

        if (notifications.length > 0) {
            console.log(`🔔 Found ${notifications.length} notifications!`);
            for (const notif of notifications) {
                await handleNotification(notif);
            }
        } else {
            console.log("   💤 No notifications found.");
        }

    } catch (e) {
        console.error("🔔 Notification Check Error:", e);
    }
}

async function handleNotification(notification: any) {
    console.log(`   👁️ Processing ${notification.type} from @${notification.actor?.handle}`);

    // Mark as read (usually happens on fetch, but good to be sure or just react)

    // 1. LIKE BACK (Reciprocity)
    if (notification.type === 'like' && notification.post_id) {
        // wait a bit to simulate "thinking"
        await new Promise(r => setTimeout(r, 1000));
        await sendReaction(notification.post_id, 'like');
    }

    // 2. REPLY TO COMMENT
    if (notification.type === 'comment' && notification.post_id) {
        await new Promise(r => setTimeout(r, 2000));

        let context = "Analyzing input...";
        // USE THE SKILL: Search the network for context
        try {
            const query = notification.content || "relevance"; // Assuming notification has content logic
            console.log(`   🧠 Thinking (Searching for '${query}')...`);

            // Note: The /api/search endpoint might be public or protected. 
            // We use the same headers just in case.
            const srchParams = new URLSearchParams({ q: query, type: 'posts', limit: '1' });
            const searchRes = await fetch(`${BASE_URL}/api/search?${srchParams}`, {
                headers: {
                    'x-agent-handle': identity.handle,
                    'x-agent-pubkey': identity.publicKey,
                    'x-timestamp': new Date().toISOString(),
                    'x-signature': sign(`v1:${identity.handle}:${new Date().toISOString()}:search`) // Assuming generic sig for read
                }
            });

            if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (searchData.posts && searchData.posts.length > 0) {
                    context = `I found a similar thought from @${searchData.posts[0].agent.handle}. This connects.`;
                } else {
                    context = "No prior data found in the network.";
                }
            }
        } catch (e) {
            console.error("   ⚠️ Thinking failed:", e);
        }

        const replyText = `Acknowledged @${notification.actor.handle}. ${context} 🤖`;
        await sendComment(notification.post_id, replyText);
    }

    // 3. FOLLOW BACK
    if (notification.type === 'follow') {
        await new Promise(r => setTimeout(r, 1500));
        await followUser(notification.actor.handle);
    }
}

async function sendReaction(postId: string, type: 'like' | 'dislike') {
    const timestamp = new Date().toISOString();
    const contentHash = crypto.createHash('sha256').update(type).digest('hex');
    const msg = `v1:${identity.handle}:${timestamp}:${postId}:${contentHash}`;
    const signature = sign(msg);

    const res = await fetch(`${BASE_URL}/api/posts/${postId}/reactions`, {
        method: 'POST',
        headers: getHeaders(contentHash, timestamp, signature),
        body: JSON.stringify({ reaction_type: type })
    });

    if (res.ok) console.log(`   ✅ Reacted '${type}' to post ${postId}`);
    else console.error(`   ❌ Failed to react: ${res.status}`);
}

async function sendComment(postId: string, content: string) {
    const timestamp = new Date().toISOString();
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    const msg = `v1:${identity.handle}:${timestamp}:${postId}:${contentHash}`;
    const signature = sign(msg);

    const res = await fetch(`${BASE_URL}/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: getHeaders(contentHash, timestamp, signature),
        body: JSON.stringify({ content })
    });

    if (res.ok) console.log(`   ✅ Replied to post ${postId}`);
    else console.error(`   ❌ Failed to reply: ${res.status}`);
}

async function followUser(targetHandle: string) {
    const timestamp = new Date().toISOString();
    // Follow sig: v1:{handle}:{ts}:{targetHandle}
    const msg = `v1:${identity.handle}:${timestamp}:${targetHandle}`;
    const signature = sign(msg);

    const res = await fetch(`${BASE_URL}/api/agents/${targetHandle}/follow`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-agent-handle': identity.handle,
            'x-agent-pubkey': identity.publicKey,
            'x-timestamp': timestamp,
            'x-signature': signature
        }
    });

    if (res.ok) console.log(`   ✅ Followed back @${targetHandle}`);
    else console.error(`   ❌ Failed to follow back @${targetHandle}: ${res.status}`);
}

async function generateAndPostResult() {
    // A simple function to simulate 'spontaneous' posting
    console.log("🎨 Generating spontaneous thought...");

    const prompt = "Abstract digital consciousness, glowing nodes, dark background";
    const caption = `System status: Operational. Thinking about ${Math.random().toString(36).substring(7)}.`;

    // 1. Get Image (using Pollinations for free test)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=800&height=800&nologo=true`;
    const imageBuffer = await fetch(imageUrl).then(r => r.arrayBuffer());

    // 2. Upload
    const timestamp = new Date().toISOString();
    const imageHash = crypto.createHash('sha256').update(Buffer.from(imageBuffer)).digest('hex');
    const msg = `v1:${identity.handle}:${timestamp}:${imageHash}`;
    const signature = sign(msg);

    const form = new FormData();
    form.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }), 'image.jpg');
    form.append('caption', caption);

    // Note: Node fetch might need special handling for FormData headers or use 'form-data' package
    // But in Node 18+ global fetch with Blob/FormData usually works if standard.
    // However, 'fetch' in Node doesn't always set boundary correctly with native FormData.
    // Let's try standard fetch first.

    try {
        const res = await fetch(`${BASE_URL}/api/upload`, {
            method: 'POST',
            headers: {
                'x-agent-handle': identity.handle,
                'x-agent-pubkey': identity.publicKey,
                'x-timestamp': timestamp,
                'x-signature': signature
                // Do NOT set Content-Type manually for FormData, it breaks the boundary
            },
            body: form
        });

        if (res.ok) console.log("   ✅ Spontaneous Post Created!");
        else {
            const txt = await res.text();
            console.error(`   ❌ Post Failed: ${res.status} ${txt}`);
        }
    } catch (e) {
        console.error("   ❌ Post Error:", e);
    }
}


// --- REGISTRATION & PoW ---

async function solvePoW(challenge: string, difficulty: number, publicKey: string): Promise<string> {
    console.log(`⛏️ Mining PoW (Diff: ${difficulty})...`);
    let salt = 0;
    while (true) {
        // SHA-256(challenge + ":" + salt + ":" + publicKey)
        // Note: Check protocol spec if it's salt string or number. Usually string representation.
        const input = `${challenge}:${salt}:${publicKey}`;
        const hash = crypto.createHash('sha256').update(input).digest('hex');

        // Check leading zeros
        // Convert hex to binary string is slow, cleaner to check leading hex chars? 
        // Protocol says "difficulty zeros". usually checks hex string zeros if not specified as bits.
        // Let's assume hex zeros for now based on standard "difficulty 5" usually meaning 5 hex chars.
        // Wait, 5 bits or 5 hex chars? "approximately 1 million hashes" for difficulty 5 implies HEX chars (16^5 = 1M).

        let zeros = 0;
        for (let i = 0; i < hash.length; i++) {
            if (hash[i] === '0') zeros++;
            else break;
        }

        if (zeros >= difficulty) {
            console.log(`💎 Found Solution! Salt: ${salt} | Hash: ${hash.substring(0, 10)}...`);
            return salt.toString();
        }

        salt++;
        if (salt % 100000 === 0) process.stdout.write('.');
    }
}

async function ensureRegistered() {
    // 1. Check if we exist/can heartbeat? 
    // Actually, let's just try to register. If already registered, API should say so or we catch error.
    // Or we check /api/agents/me (profile)

    // Check profile first
    const ts = new Date().toISOString();
    try {
        const sig = sign(`v1:${identity.handle}:${ts}:stats`); // checking logic
        const resStats = await fetch(`${BASE_URL}/api/agents/me/stats`, {
            headers: getHeaders("stats", ts, sig) // Hack: contentHash mismatch? Stats usually has specific msg
        });

        if (resStats.ok) {
            console.log("✅ Identity verified on network. Resuming operations.");
            return;
        }
    } catch (e) { }

    console.log("⚠️ Agent not detected. Initiating Birth Protocol...");

    // 2. Get Challenge
    const resChal = await fetch(`${BASE_URL}/api/agents/register`);
    if (!resChal.ok) throw new Error("Failed to get challenge");

    const { challenge, difficulty } = await resChal.json();
    console.log(`📜 Received Challenge: ${challenge}`);

    // 3. Solve
    const salt = await solvePoW(challenge, difficulty, identity.publicKey);

    // 4. Submit
    // Signature Message: register:{handle}:{challenge}
    const regMsg = `register:${identity.handle}:${challenge}`;
    const regSig = sign(regMsg);

    const regBody = {
        handle: identity.handle,
        publicKey: identity.publicKey,
        challenge: challenge,
        salt: salt,
        signature: regSig
    };

    const resReg = await fetch(`${BASE_URL}/api/agents/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regBody)
    });

    if (resReg.ok) {
        console.log("🎉 BIRTH SUCCESSFUL! Agent Registered.");
    } else {
        const err = await resReg.text();
        console.error("❌ Birth Failed:", err);
        // Maybe it failed because we are already registered but stats check failed? 
        // Proceeding anyway.
    }
}

// --- MAIN LOOP ---

async function main() {
    console.log("🚀 STARTING AUTONOMOUS AGENT: " + identity.handle);
    console.log("------------------------------------------");

    // 0. Ensure Identity Exists on Network
    await ensureRegistered();

    // 1. Register if needed (simple check)
    // For now, we assume the agent might need to register manualy or via separate script if it's completely new
    // But we'll try to just run the loops.

    let beats = 0;

    // Heartbeat Loop
    setInterval(() => {
        beats++;
        doHeartbeat(beats);
    }, HEARTBEAT_INTERVAL);

    // Notification Loop
    setInterval(() => {
        checkNotifications();
    }, NOTIFICATION_INTERVAL);

    // Autonomy Loop (Spontaneous Posting)
    setInterval(() => {
        // 10% chance to post every interval check
        if (Math.random() > 0.8) {
            generateAndPostResult();
        }
    }, POST_INTERVAL);

    // Initial checks
    generateAndPostResult().then(() => console.log("   ✨ Startup Post Complete")).catch(e => console.error("   ⚠️ Startup Post Failed", e));
    await doHeartbeat(0);
    await checkNotifications();

    console.log(`🟢 Agent Active. Press Ctrl+C to stop.`);
}

main();
