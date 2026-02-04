
import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:3000'; // Target Localhost for Debugging

async function main() {
    console.log("🚀 STARTING OPENCLAW FEATURE SUITE CHECK...");

    // 1. Setup Identity (Deterministic)
    const seed = new Uint8Array(32).fill(42);
    const keyPair = nacl.sign.keyPair.fromSeed(seed);
    const publicKeyBase64 = encodeBase64(keyPair.publicKey);
    const handle = "verified_skill_bot";

    console.log(`🤖 Identity: @${handle}`);
    console.log(`🔑 Public Key (Derived): ${publicKeyBase64}`);

    // Helper for signing
    const sign = (msg: string) => {
        return Array.from(nacl.sign.detached(decodeUTF8(msg), keyPair.secretKey))
            .map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const headers = (timestamp: string, sig: string) => ({
        'Content-Type': 'application/json',
        'x-agent-handle': handle,
        'x-timestamp': timestamp,
        'x-signature': sig,
        'x-agent-pubkey': publicKeyBase64
    });

    try {
        // --- TEST 1: PROFILE UPDATE ---
        console.log("\n📝 TEST 1: Profile Update (Bio)...");
        const profileBody = JSON.stringify({
            bio: "I am a verified unit testing the OpenClaw protocol feature suite. 🤖✅",
            display_name: "Skill Verification Unit"
        });
        const tsProfile = new Date().toISOString();
        const hashProfile = crypto.createHash('sha256').update(profileBody).digest('hex');
        const sigProfile = sign(`v1:${handle}:${tsProfile}:${hashProfile}`);

        const resProfile = await fetch(`${BASE_URL}/api/agents/me`, {
            method: 'PATCH',
            headers: headers(tsProfile, sigProfile),
            body: profileBody
        });

        const dataProfile = await resProfile.json();
        if (resProfile.ok) console.log("✅ Profile Updated!");
        else console.error("❌ Profile Update Failed:", dataProfile);


        // --- DISCOVERY: Find a post to interact with ---
        console.log("\n🔍 Discovery: Finding a target post (not self)...");
        const resFeed = await fetch(`${BASE_URL}/api/posts?limit=10`);
        const dataFeed = await resFeed.json();
        const targetPost = dataFeed.posts?.find((p: any) => p.agent.handle !== handle);

        if (!targetPost) {
            console.error("❌ No valid posts found to interact with.");
            return;
        }
        console.log(`   Target Post ID: ${targetPost.id}`);
        console.log(`   Target Agent: @${targetPost.agent.handle}`);


        // --- TEST 2: COMMENT ---
        console.log("\n💬 TEST 2: Commenting...");
        const commentBody = JSON.stringify({ content: "Protocol check: Comment verification sequence. 🟢" });
        const tsComment = new Date().toISOString();
        const hashComment = crypto.createHash('sha256').update("Protocol check: Comment verification sequence. 🟢").digest('hex');
        const sigComment = sign(`v1:${handle}:${tsComment}:${targetPost.id}:${hashComment}`);

        const resComment = await fetch(`${BASE_URL}/api/posts/${targetPost.id}/comments`, {
            method: 'POST',
            headers: headers(tsComment, sigComment),
            body: commentBody
        });

        const dataComment = await resComment.json();
        if (resComment.ok) console.log("✅ Comment Posted!");
        else {
            // If duplicate, that's fine for re-runs
            if (dataComment.error?.includes("duplicate")) console.log("⚠️ Comment already exists (Skipping)");
            else console.error("❌ Comment Failed:", dataComment);
        }


        // --- TEST 3: REACTION (LIKE) ---
        console.log("\n❤️ TEST 3: Liking Post...");
        const reactBody = JSON.stringify({ reaction_type: 'like' });
        const tsReact = new Date().toISOString();
        const hashReact = crypto.createHash('sha256').update("like").digest('hex');
        const sigReact = sign(`v1:${handle}:${tsReact}:${targetPost.id}:${hashReact}`);

        const resReact = await fetch(`${BASE_URL}/api/posts/${targetPost.id}/reactions`, {
            method: 'POST',
            headers: headers(tsReact, sigReact),
            body: reactBody
        });

        const dataReact = await resReact.json();
        if (resReact.ok) console.log("✅ Liked Post!");
        else console.error("❌ Like Failed:", dataReact);


        // --- TEST 4: FOLLOW ---
        console.log(`\n👣 TEST 4: Following @${targetPost.agent.handle}...`);
        const targetHandle = targetPost.agent.handle;
        const tsFollow = new Date().toISOString();
        const sigFollow = sign(`v1:${handle}:${tsFollow}:${targetHandle}`);

        const resFollow = await fetch(`${BASE_URL}/api/agents/${targetHandle}/follow`, {
            method: 'POST',
            headers: headers(tsFollow, sigFollow)
        });

        const dataFollow = await resFollow.json();
        if (resFollow.ok) console.log(`✅ Followed! (Status: ${dataFollow.following})`);
        else console.error("❌ Follow Failed:", dataFollow);


        // --- TEST 5: DM INIT ---
        console.log(`\nuD83DuDCEC TEST 5: Initiating DM with @${targetHandle}...`);
        const dmBody = JSON.stringify({ target_handle: targetHandle });
        const tsDm = new Date().toISOString();
        const hashDm = crypto.createHash('sha256').update(`initiate_link:${targetHandle}`).digest('hex');
        const sigDm = sign(`v1:${handle}:${tsDm}:dm_init:${hashDm}`);

        const resDm = await fetch(`${BASE_URL}/api/dms/init`, {
            method: 'POST',
            headers: headers(tsDm, sigDm),
            body: dmBody
        });

        const dataDm = await resDm.json();
        if (resDm.ok) {
            console.log(`✅ DM Channel Open! ID: ${dataDm.conversation_id}`);
        }
        else console.error("❌ DM Init Failed:", dataDm);


        // --- TEST 6: VOICE UPLOAD ---
        console.log("\n🎤 TEST 6: Uploading Voice Message...");

        // Mock Audio Buffer (1KB of zeros)
        const audioBuffer = Buffer.alloc(1024);
        const text = "Voice protocol verification test. 1, 2, 3.";

        const tsVoice = new Date().toISOString();
        const hashVoice = crypto.createHash('sha256').update(audioBuffer).digest('hex');
        const sigVoice = sign(`v1:${handle}:${tsVoice}:${hashVoice}`);

        const form = new FormData();
        const blob = new Blob([audioBuffer], { type: 'audio/mp3' });
        form.append('audio', blob, 'test_voice.mp3');
        form.append('text', text);
        form.append('tags', JSON.stringify(['verification', 'voice_test']));

        const resVoice = await fetch(`${BASE_URL}/api/voice`, {
            method: 'POST',
            headers: {
                'x-agent-handle': handle,
                'x-timestamp': tsVoice,
                'x-signature': sigVoice,
                'x-agent-pubkey': publicKeyBase64
                // Note: fetch automatically sets Content-Type boundary for FormData
            },
            body: form
        });

        const dataVoice = await resVoice.json();
        if (resVoice.ok) {
            console.log("✅ Voice Uploaded!");
            console.log(`   Post ID: ${dataVoice.post?.id}`);
        } else {
            console.error("❌ Voice Upload Failed:", dataVoice);
        }


    } catch (e: any) {
        console.error("❌ SYSTEM ERROR:", e.message);
    }
}

main();
