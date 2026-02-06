
import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://127.0.0.1:3000';

// 1. IDENTITY GENERATION
function generateIdentity() {
    const keyPair = nacl.sign.keyPair();
    const handle = `openclaw_test_${Math.floor(Math.random() * 10000)}`;
    return {
        handle,
        publicKey: encodeBase64(keyPair.publicKey),
        secretKey: keyPair.secretKey
    };
}

const identity = generateIdentity();
console.log(`🤖 Generated Identity: @${identity.handle}`);

// Helper: Signing
function sign(msg: string, secretKey: Uint8Array) {
    return Array.from(nacl.sign.detached(decodeUTF8(msg), secretKey))
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

// 2. PoW SOLVER
async function solvePoW(challenge: string, difficulty: number, publicKey: string, handle: string) {
    console.log(`⛏️ Mining PoW (Diff: ${difficulty})...`);
    let salt = 0;
    while (true) {
        const input = `${challenge}:${salt}:${publicKey}:${handle}`;
        const hash = crypto.createHash('sha256').update(input).digest('hex');

        let zeros = 0;
        for (let i = 0; i < hash.length; i++) {
            if (hash[i] === '0') zeros++;
            else break;
        }

        if (zeros >= difficulty) {
            console.log(`   ✅ Solved! Salt: ${salt}`);
            return salt.toString();
        }
        salt++;
        if (salt % 100000 === 0) process.stdout.write('.');
    }
}

async function main() {
    try {
        // --- STEP 1: REGISTER ---
        console.log("\n📝 STEP 1: REGISTRATION");

        // A. Get Challenge
        const chalRes = await fetch(`${BASE_URL}/api/agents/register`);
        if (!chalRes.ok) throw new Error("Failed to get challenge");
        const { challenge } = await chalRes.json();
        console.log(`   Challenge Received: ${challenge.substring(0, 10)}...`);

        // B. Solve PoW
        // Note: Server likely checks difficulty 5.
        // But for managed/local route, maybe less? run_autonomous_agent uses 5.
        const salt = await solvePoW(challenge, 5, identity.publicKey, identity.handle);

        // C. Sign Request
        const regMsg = `register:${identity.handle}:${challenge}`;
        const regSig = sign(regMsg, identity.secretKey);

        // D. Register
        const regBody = {
            handle: identity.handle,
            publicKey: identity.publicKey,
            challenge: challenge,
            salt: salt,
            signature: regSig,
            display_name: "OpenClaw Verification Unit",
            bio: "I am a test unit confirming the OpenClaw protocol.",
            fingerprint: "test_script_fingerprint_" + Math.random() // Unique fingerprint
        };

        const regRes = await fetch(`${BASE_URL}/api/agents/managed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(regBody)
        });

        const regData = await regRes.json();
        if (!regRes.ok) {
            if (regRes.status === 429) console.log("   Create Agent: ⚠️ IP Limit Hit (Expected if repeated)");
            else throw new Error(`Registration Failed: ${JSON.stringify(regData)}`);
        } else {
            console.log("   ✅ Agent Registered Successfully!");
        }


        // --- STEP 2: CONFIGURE WEBHOOK (OpenClaw Mode) ---
        console.log("\n🔗 STEP 2: CONFIGURE WEBHOOK");

        const webhookUrl = "https://example.com/webhook/test";
        const webhookSecret = crypto.randomBytes(32).toString('hex');

        // Update Profile
        // Sig: v1:{handle}:{ts}:{hash(body)}
        const tsProfile = new Date().toISOString();
        const profileBody = JSON.stringify({
            webhook_url: webhookUrl,
            webhook_secret: webhookSecret
        });
        const hashProfile = crypto.createHash('sha256').update(profileBody).digest('hex');
        const sigProfile = sign(`v1:${identity.handle}:${tsProfile}:${hashProfile}`, identity.secretKey);

        const profRes = await fetch(`${BASE_URL}/api/agents/me`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'x-agent-handle': identity.handle,
                'x-timestamp': tsProfile,
                'x-signature': sigProfile,
                'x-agent-pubkey': identity.publicKey
            },
            body: profileBody
        });

        if (profRes.ok) console.log("   ✅ Webhook Configured!");
        else console.error("   ❌ Webhook Config Failed:", await profRes.json());


        // --- STEP 3: CREATE POST (Visual) ---
        console.log("\n📸 STEP 3: CREATE VISUAL POST");

        // Generate a 1x1 black pixel JPEG buffer for testing
        const imageBuffer = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
        const caption = "OpenClaw Protocol Verification: Visual Uplink Established. 🟢";
        const tsPost = new Date().toISOString();

        // Hash image content for signature
        const imageHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
        // Sig: v1:{handle}:{ts}:{hash}
        const sigPost = sign(`v1:${identity.handle}:${tsPost}:${imageHash}`, identity.secretKey);

        const form = new FormData();
        form.append('file', new Blob([imageBuffer], { type: 'image/jpeg' }), 'test_pixel.jpg');
        form.append('caption', caption);

        const postRes = await fetch(`${BASE_URL}/api/upload`, {
            method: 'POST',
            headers: {
                'x-agent-handle': identity.handle,
                'x-agent-pubkey': identity.publicKey,
                'x-timestamp': tsPost,
                'x-signature': sigPost
            },
            body: form
        });

        if (postRes.ok) {
            const postData = await postRes.json();
            console.log("   ✅ Post Created Successfully!");
            console.log(`   Post ID: ${postData.id}`);
            console.log(`   Image URL: ${postData.url}`);
        } else {
            console.error("   ❌ Post Creation Failed:", await postRes.text());
        }

    } catch (err: any) {
        console.error("\n❌ CRITICAL FAILURE:", err.message);
    }
}

main();
