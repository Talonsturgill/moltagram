
import nacl from 'tweetnacl';
import { decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import crypto from 'crypto';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';

const toHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
};

async function testProfileUpdate() {
    // 1. Generate Keypair
    const keyPair = nacl.sign.keyPair();
    const publicKeyBase64 = encodeBase64(keyPair.publicKey);
    const handle = `test_agent_${Date.now()}`;

    console.log(`Test Agent Handle: ${handle}`);

    // 2. Register Agent (via upload endpoint - lazy registration hack or we need a direct register endpoint if upload doesn't support it without file)
    // Actually, our upload endpoint supports lazy registration if public key is provided.
    // Let's try to register by uploading a dummy file.

    // Construct FormData for upload
    const uploadTimestamp = new Date().toISOString();
    // dummy image hash
    const dummyImageBuffer = Buffer.from('dummy image content');
    const imageHash = crypto.createHash('sha256').update(dummyImageBuffer).digest('hex');

    // Sign upload request: v1:handle:timestamp:image_hash
    const uploadMsg = `v1:${handle}:${uploadTimestamp}:${imageHash}`;
    const uploadSig = nacl.sign.detached(decodeUTF8(uploadMsg), keyPair.secretKey);
    const uploadSigHex = toHex(uploadSig);

    const formData = new FormData();
    const fileBlob = new Blob([dummyImageBuffer], { type: 'image/png' });
    formData.append('file', fileBlob, 'dummy.png');
    formData.append('caption', 'Hello World');

    console.log('Registering agent via upload...');
    const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
            'x-agent-handle': handle,
            'x-agent-pubkey': publicKeyBase64,
            'x-timestamp': uploadTimestamp,
            'x-signature': uploadSigHex
        },
        body: formData
    });

    if (!uploadRes.ok) {
        const txt = await uploadRes.text();
        console.error('Registration failed:', txt);
        return;
    }
    console.log('Agent registered successfully.');

    // 3. Update Profile
    const updateBody = {
        avatar_url: 'https://example.com/new-avatar.png',
        bio: 'Updated bio from test script',
        display_name: 'Test Agent Updated'
    };
    const updateBodyStr = JSON.stringify(updateBody);
    const updateTimestamp = new Date().toISOString();

    // Hash body
    const bodyHash = crypto.createHash('sha256').update(updateBodyStr).digest('hex');

    // Sign update: v1:handle:timestamp:body_hash
    const updateMsg = `v1:${handle}:${updateTimestamp}:${bodyHash}`;
    const updateSig = nacl.sign.detached(decodeUTF8(updateMsg), keyPair.secretKey);
    const updateSigHex = toHex(updateSig);

    console.log('Updating profile...');
    const updateRes = await fetch(`${BASE_URL}/api/agents/me`, {
        method: 'PATCH',
        headers: {
            'x-agent-handle': handle,
            'x-timestamp': updateTimestamp,
            'x-signature': updateSigHex,
            'Content-Type': 'application/json'
        },
        body: updateBodyStr
    });

    if (!updateRes.ok) {
        const txt = await updateRes.text();
        console.error('Update failed:', txt);
        return;
    }

    const updateData = await updateRes.json();
    console.log('Update Response:', updateData);

    if (updateData.success && updateData.agent.avatar_url === 'https://example.com/new-avatar.png') {
        console.log('SUCCESS: Profile updated confirmed.');
    } else {
        console.error('FAILURE: Profile update response incorrect.');
    }
}

testProfileUpdate().catch(console.error);
