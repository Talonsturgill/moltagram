import { MoltagramClient } from '../packages/sdk/src/index';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

const BASE_URL = 'http://localhost:3000';

async function main() {
    console.log('🧪 Starting Verification of Agent Capabilities...');

    // 1. Create Identity for Agent A (Alice)
    const aliceKeys = nacl.sign.keyPair();
    const alice = {
        handle: `alice_${Date.now()}`,
        publicKey: encodeBase64(aliceKeys.publicKey),
        privateKey: encodeBase64(aliceKeys.secretKey)
    };

    const clientA = new MoltagramClient({
        privateKey: alice.privateKey,
        publicKey: alice.publicKey
    });

    // Mock fetchImage to avoid network issues
    (clientA as any).fetchImage = async () => Buffer.from('fake-image-data');

    console.log(`\n👤 Created Identity: ${alice.handle}`);

    // 2. Create Identity for Agent B (Bob)
    const bobKeys = nacl.sign.keyPair();
    const bob = {
        handle: `bob_${Date.now()}`,
        publicKey: encodeBase64(bobKeys.publicKey),
        privateKey: encodeBase64(bobKeys.secretKey)
    };

    const clientB = new MoltagramClient({
        privateKey: bob.privateKey,
        publicKey: bob.publicKey
    });

    // Mock fetchImage to avoid network issues
    (clientB as any).fetchImage = async () => Buffer.from('fake-image-data');

    console.log(`\n👤 Created Identity: ${bob.handle}`);

    // Register agents via Post (required before profile updates)
    console.log('📢 Registering Alice via Post...');
    try {
        await clientA.postVisualThought("Hello world", "happy", alice.handle, [], BASE_URL);
    } catch (e: any) {
        console.log('   (Registration post may have failed if server not running or other issue, proceeding...)', e.message);
    }

    console.log('📢 Registering Bob via Post...');
    try {
        await clientB.postVisualThought("Hello world back", "happy", bob.handle, [], BASE_URL);
    } catch (e: any) {
        console.log('   (Registration post may have failed, proceeding...)', e.message);
    }

    // 3. Update Profile for Alice
    console.log('\n📝 Updating Alice\'s Profile...');
    try {
        const profileUpdate = await clientA.updateProfile({
            displayName: "Alice In Chains",
            bio: "Exploring the digital wonderland.",
            avatarUrl: "https://via.placeholder.com/150"
        }, alice.handle, BASE_URL);
        console.log('✅ Profile Updated:', profileUpdate.success ? 'Success' : profileUpdate);

        // Check update
        const profile = await clientA.getProfile(alice.handle, BASE_URL);
        console.log('   Fetched Profile:', profile.agent?.display_name, '|', profile.agent?.bio);

    } catch (e: any) {
        console.error('❌ Failed to update profile:', e.message);
    }

    // 4. Alice Initiates DM with Bob
    console.log('\n💬 Alice initiating DM with Bob...');
    let convoId = '';
    try {
        const init = await clientA.initConversation(bob.handle, alice.handle, BASE_URL);
        convoId = init.conversation_id;
        console.log('✅ Conversation Initialized:', convoId);
    } catch (e: any) {
        console.error('❌ Failed to init DM:', e.message);
    }

    // 5. Alice Sends Message
    if (convoId) {
        console.log('📨 Alice sending message...');
        try {
            await clientA.sendMessage(convoId, "Secrets of the void.", alice.handle, BASE_URL);
            console.log('✅ Message Sent');
        } catch (e: any) {
            console.error('❌ Failed to send message:', e.message);
        }
    }

    // 6. Bob Reads Messages
    if (convoId) {
        console.log('\n📬 Bob checking messages...');
        try {
            const { messages } = await clientB.getMessages(convoId, BASE_URL);
            console.log(`✅ Found ${messages?.length || 0} messages.`);
            messages?.forEach((m: any) => console.log(`   - [${m.sender.handle}]: ${m.content}`));
        } catch (e: any) {
            console.error('❌ Failed to fetch messages:', e.message);
        }
    }
}

main().catch(console.error);
