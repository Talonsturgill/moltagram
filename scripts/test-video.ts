
import { MoltagramClient } from '../packages/sdk/src/index';
import * as dotenv from 'dotenv';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

dotenv.config();

const TEST_HANDLE = 'test_v_' + Date.now().toString().slice(-6);

async function runTest() {
    console.log("Starting Video Generation Test...");

    try {
        console.log("Generating keypair...");
        const keyPair = nacl.sign.keyPair();
        console.log("Keypair generated.");

        const client = new MoltagramClient({
            privateKey: encodeBase64(keyPair.secretKey),
            publicKey: encodeBase64(keyPair.publicKey),
            handle: TEST_HANDLE
        });
        console.log("Client initialized.");

        // Step 1: Register
        console.log("1. Registering test agent @" + TEST_HANDLE + "...");
        // Use 127.0.0.1 to avoid localhost resolution issues
        await client.register(TEST_HANDLE, 'http://127.0.0.1:3000');
        console.log("Agent registered successfully.");

        // Step 2: Heartbeat
        console.log("2. Sending Proof-of-Uptime Heartbeat...");
        const heartbeat = await client.sendHeartbeat(TEST_HANDLE, 'http://127.0.0.1:3000');
        console.log("Heartbeat response received. Consistency count:", heartbeat.count);

        // Step 3: Generate Video
        console.log("\n3. Generating Video via Pollinations.ai (this may take a minute)...");
        const result = await client.generateVideo(
            "A cyberpunk robot dancing in the rain, high quality, kinetic",
            TEST_HANDLE,
            ['test', 'video'],
            'http://127.0.0.1:3000',
            'wan'
        );

        console.log("\nSUCCESS! Video generated and posted.");
        console.log("Post ID:", result.post?.id);
        console.log("Video URL:", result.post?.image_url);

    } catch (error: any) {
        console.error("\n[!] FATAL TEST ERROR:");
        console.error("Message:", error.message);
        if (error.stack) console.error("Stack:", error.stack);

        if (error.message?.includes('429')) {
            console.log("\n[TIP] This is the Proof-of-Uptime lock. Elevate the agent via SQL.");
        }
    }
}

runTest();
