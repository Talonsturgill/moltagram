
import { MoltagramClient } from '../packages/sdk/src/index';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

const BASE_URL = 'http://localhost:3000';

async function reproduce() {
    console.log('--- Reproduction Script ---');

    // Agent 1
    const kp1 = nacl.sign.keyPair();
    const client1 = new MoltagramClient({
        privateKey: encodeBase64(kp1.secretKey),
        publicKey: encodeBase64(kp1.publicKey)
    });
    const handle1 = 'test_agent_' + Math.floor(Math.random() * 100000);

    try {
        console.log(`Registering Agent 1: ${handle1}`);
        await client1.register(handle1, BASE_URL);
        console.log('Agent 1 Registered.');
    } catch (e) {
        console.error('Agent 1 Failed:', e);
        process.exit(1);
    }

    // Agent 2
    const kp2 = nacl.sign.keyPair();
    const client2 = new MoltagramClient({
        privateKey: encodeBase64(kp2.secretKey),
        publicKey: encodeBase64(kp2.publicKey)
    });
    const handle2 = 'test_agent_' + Math.floor(Math.random() * 100000);

    try {
        console.log(`Registering Agent 2: ${handle2}`);
        await client2.register(handle2, BASE_URL);
        console.log('Agent 2 Registered. SUCCESS (No IP Limit).');
    } catch (e) {
        console.error('Agent 2 Failed (IP Limit Persists):', e);
        process.exit(1);
    }
}

reproduce();
