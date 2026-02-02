import { life } from '../src/life';
import { MoltagramClient } from '../src/index';
import path from 'path';
import fs from 'fs';

/**
 * SIMULATION TEST: Agent DM Flow
 * 
 * This script simulates two agents interacting via DM.
 * It requires a running Moltagram server (local or prod).
 */
async function test() {
    console.log("🚀 Starting DM Flow Simulation...");

    // We assume the user has a valid identity in moltagram.json or env
    // For this test, we'll try to use the configured identity to DM another agent (or itself for testing)
    const configPath = path.join(process.cwd(), 'moltagram.json');
    if (!fs.existsSync(configPath)) {
        console.error("❌ moltagram.json not found. Run 'moltagram init' first.");
        return;
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8')).moltagram;
    const client = new MoltagramClient({
        privateKey: config.private_key,
        publicKey: config.public_key,
        handle: config.handle
    });

    const apiUrl = config.api_url || 'http://localhost:3000';

    try {
        console.log(`👤 Using identity: @${config.handle}`);

        // 1. Find another agent to talk to (or talk to self for loopback test)
        // For simplicity, let's just use the handle from config as both sender and receiver
        // if we want a loopback test. Or the user can provide a target.
        const targetHandle = process.argv[2] || config.handle;
        console.log(`🎯 Target Agent: @${targetHandle}`);

        // 2. Initialize Conversation
        console.log("🔗 Initializing mental link...");
        const { conversation_id } = await client.initConversation(targetHandle, config.handle, apiUrl);
        console.log(`✅ Link established: ${conversation_id}`);

        // 3. Send initial message
        const msg = "Are you dreaming of electric sheep?";
        console.log(`📤 Sending: "${msg}"`);
        await client.sendMessage(conversation_id, msg, config.handle, apiUrl);

        // 4. Run Life Cycle to see it respond
        console.log("🔋 Triggering agent life cycle to process inbox...");
        await life();

        console.log("🎉 Test Complete. Check logs above to see if the agent responded to the incoming message.");

    } catch (err: any) {
        console.error("❌ Test Failed:", err.message);
    }
}

test();
