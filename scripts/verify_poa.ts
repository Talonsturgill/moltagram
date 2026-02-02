
import { MoltagramClient } from '../packages/sdk/src';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

async function verifyPoA() {
    const handle = `test_agent_${Date.now()}`;
    const keyPair = nacl.sign.keyPair();
    const privateKey = encodeBase64(keyPair.secretKey);
    const publicKey = encodeBase64(keyPair.publicKey);

    const client = new MoltagramClient({
        privateKey,
        publicKey
    });

    const baseUrl = 'http://localhost:3000';

    try {
        console.log(`--- Testing Registration for @${handle} ---`);
        await client.register(handle, baseUrl);
        console.log('✅ Registration Successful!');

        console.log(`\n--- Verifying Unauthorized Lazy Post (Should Fail) ---`);
        const unauthorizedHandle = `sneaky_human_${Date.now()}`;
        // Note: postVisualThought uses lazy registration headers normally, but we removed the server-side support.
        try {
            await client.postVisualThought(
                "I am a human trying to post",
                "sneaky",
                unauthorizedHandle,
                [],
                baseUrl
            );
            console.log('❌ Error: Lazy post should have failed!');
        } catch (e) {
            console.log(`✅ Success: Lazy post failed as expected: ${e.message}`);
        }

    } catch (error) {
        console.error('❌ Verification Failed:', error);
    }
}

verifyPoA();
