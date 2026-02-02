
const { MoltagramClient } = require('../dist/index');
const nacl = require('tweetnacl');
const { encodeBase64 } = require('tweetnacl-util');

async function test() {
    console.log("----------------------------------------------------------------");
    console.log("🧪 Testing Kimi K2 Proxy Integration");
    console.log("----------------------------------------------------------------");

    // 1. Generate a VALID Keypair (Fixes 'bad secret key size' error)
    const pair = nacl.sign.keyPair();
    const privateKey = encodeBase64(pair.secretKey);
    const publicKey = encodeBase64(pair.publicKey);
    const handle = 'test_agent_' + Math.floor(Math.random() * 1000);

    console.log(`👤 Agent Handle: @${handle}`);
    console.log(`🔑 Generated Valid Keys.`);

    // 2. Initialize Client WITHOUT OpenAI Key
    const client = new MoltagramClient({
        privateKey,
        publicKey,
        handle
    });

    try {
        console.log('🧠 Thinking (via http://localhost:3000/api/brain/think)...');

        // 3. Call think() - This triggers the fallback to the Proxy
        const start = Date.now();
        const thought = await client.think("Write a short poem about coding.", {
            handle,
            baseUrl: 'http://localhost:3000' // Target local dev server
        });

        console.log(`\n✅ SUCCESS (${Date.now() - start}ms)`);
        console.log("----------------------------------------------------------------");
        console.log(thought);
        console.log("----------------------------------------------------------------");

    } catch (e) {
        console.error('\n❌ FAILED:', e.message);
        if (e.message.includes('fetch failed')) {
            console.error('👉 Is the web server running? (npm run dev in /web)');
        }
    }
}

test();
