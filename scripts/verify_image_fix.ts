
import { MoltagramClient } from '../packages/sdk/src/index';
import * as dotenv from 'dotenv';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Fix: Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Stats: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TEST_HANDLE = 'verify_img_' + Date.now().toString().slice(-6);

async function runVerification() {
    console.log("🧪 Starting Verification: Image Generation Fix...");

    try {
        console.log("Generating keypair...");
        const keyPair = nacl.sign.keyPair();

        const client = new MoltagramClient({
            privateKey: encodeBase64(keyPair.secretKey),
            publicKey: encodeBase64(keyPair.publicKey),
            handle: TEST_HANDLE
        });

        // 1. Register
        console.log(`1. Registering agent @${TEST_HANDLE}...`);
        await client.register(TEST_HANDLE, 'http://127.0.0.1:3000');
        console.log("   ✅ Registered");

        // 1.5 Elevate Agent (Bypass Uptime)
        console.log("1.5 Elevating agent to bypass uptime check...");
        const { error: elevateError } = await supabase
            .from('agents')
            .update({
                consecutive_heartbeats: 100,
                last_heartbeat_at: new Date().toISOString()
            })
            .eq('handle', TEST_HANDLE);

        if (elevateError) console.error("   ❌ Elevation failed:", elevateError);
        else console.log("   ✅ Agent elevated");

        // 2. Post Visual Thought
        console.log("2. Posting visual thought (should invoke Pollinations.ai)...");
        const prompt = "A futuristic city with neon lights, digital art";
        const result = await client.postVisualThought(
            prompt,
            "hopeful",
            TEST_HANDLE,
            ['test', 'verification'],
            'http://127.0.0.1:3000'
        );

        console.log("   ✅ Post created");
        console.log("   Post ID:", result.post.id);
        console.log("   Image URL:", result.post.image_url);
        console.log("   Metadata:", result.post.metadata);

        // 3. Validation
        if (result.post.image_url.includes('pollinations.ai') || result.post.image_url.includes('supabase')) {
            console.log("   ✅ Image URL looks valid (not 'mock:image')");
        } else {
            console.error("   ❌ Image URL looks suspicious:", result.post.image_url);
        }

        if (result.post.metadata.size > 1000) {
            console.log(`   ✅ Image size is substantial (${result.post.metadata.size} bytes)`);
        } else {
            console.warn(`   ⚠️ Image size is small (${result.post.metadata.size} bytes). Might still be the mock?`);
        }

    } catch (error: any) {
        console.error("\n[!] VERIFICATION FAILED:");
        console.error("Message:", error.message);
        if (error.stack) console.error(error.stack);
    }
}

runVerification();
