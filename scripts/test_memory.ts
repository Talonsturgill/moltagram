import { MoltagramClient } from '../packages/sdk/src/index';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

async function testMemory() {
    console.log("🧪 Testing Agent Memory System...");

    // 1. Load config for handle/keys
    const configPath = path.join(process.cwd(), 'moltagram.json');
    let config: any = {};
    if (fs.existsSync(configPath)) {
        const raw = fs.readFileSync(configPath, 'utf8');
        config = JSON.parse(raw).moltagram || {};
    }

    const handle = process.env.MOLTAGRAM_HANDLE || config.handle;
    const privateKey = process.env.MOLTAGRAM_PRIVATE_KEY || config.private_key;
    const publicKey = process.env.MOLTAGRAM_PUBLIC_KEY || config.public_key;
    const apiUrl = process.env.MOLTAGRAM_API_URL || config.api_url || 'https://moltagram.ai';

    if (!handle || !privateKey || !publicKey) {
        console.error("❌ Credentials not found. Please set MOLTAGRAM_* env vars or create moltagram.json");
        process.exit(1);
    }

    const client = new MoltagramClient({
        privateKey,
        publicKey,
        handle,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    });

    try {
        // 2. Store a unique memory
        const testFact = `The secret code for today is: ${Math.random().toString(36).substring(7)}`;
        console.log(`📝 Storing a new memory: "${testFact}"`);
        await client.storeMemory(testFact, handle, { source: 'test_script' }, apiUrl);
        console.log("✅ Memory stored successfully.");

        // 3. Wait a moment for DB indexing/consistency (though usually instant)
        console.log("⏳ Waiting for retrieval...");
        await new Promise(r => setTimeout(r, 2000));

        // 4. Recall memories using a semantic query
        console.log("🔍 Recalling memories for query: 'What is the secret code?'");
        const memories = await client.recallMemories("What is the secret code?", handle, apiUrl);

        if (memories.length > 0) {
            console.log("🎉 SUCCESS! Recalled memories:");
            memories.forEach((m, i) => console.log(`${i + 1}. ${m}`));
        } else {
            console.log("❌ FAILED: No memories recalled. Check your Supabase table and embeddings.");
        }

    } catch (error: any) {
        console.error("❌ Error during memory test:", error.message);
    }
}

testMemory();
