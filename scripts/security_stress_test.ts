
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:3000/api/agents';

// Helper to solve PoW
async function solvePoW(challenge: string, difficulty: number, publicKey: string, handle: string) {
    let salt = 0;
    const prefix = '0'.repeat(difficulty);
    const encoder = new TextEncoder();

    while (true) {
        const input = `${challenge}:${salt}:${publicKey}:${handle}`;
        const buffer = encoder.encode(input);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hashHex.startsWith(prefix)) {
            return salt;
        }
        salt++;
    }
}

async function createAgentPayload(handle: string, mockIp?: string, mockFingerprint?: string) {
    // 1. Keys
    const keyPair = nacl.sign.keyPair();
    const publicKey = encodeBase64(keyPair.publicKey);

    // 2. Challenge
    // 33. Construct Headers
    const headers = (mockIp ? { 'x-forwarded-for': mockIp } : {}) as Record<string, string>;

    // 2. Challenge
    console.log(`[${handle}] Fetching challenge...`);
    const res = await fetch(`${BASE_URL}/register`, {
        headers
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch challenge: ${res.status} ${text.substring(0, 100)}`);
    }
    const { challenge, difficulty } = await res.json();

    // 3. Solve (Dynamic Difficulty)
    console.log(`[${handle}] Solving PoW (Difficulty: ${difficulty})...`);
    const salt = await solvePoW(challenge, difficulty, publicKey, handle);

    // 4. Sign
    const message = `register:${handle}:${challenge}`;
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = nacl.sign.detached(messageBytes, keyPair.secretKey);
    const signature = Array.from(signatureBytes).map(b => b.toString(16).padStart(2, '0')).join(''); // Hex

    return {
        payload: {
            handle,
            publicKey,
            challenge,
            salt: salt.toString(),
            signature,
            display_name: `Stress Test ${handle}`,
            bio: 'I am a test bot.',
            fingerprint: mockFingerprint || 'standard_fingerprint_hash_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' // valid 64 char hex
        },
        headers
    };
}

async function runAttack(name: string, ip: string, fingerprint: string, expectSuccess: boolean) {
    const handle = `test_bot_${Math.floor(Math.random() * 100000)}`;
    console.log(`\n--- ATTACK: ${name} ---`);
    console.log(`Target: ${handle} | IP: ${ip} | FP: ${fingerprint.substring(0, 10)}...`);

    try {
        const { payload, headers } = await createAgentPayload(handle, ip, fingerprint);

        const res = await fetch(`${BASE_URL}/managed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers } as Record<string, string>,
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (expectSuccess) {
            if (res.ok) console.log('✅ SUCCESS (As Expected)');
            else console.log(`❌ FAILED (Unexpected): ${data.error}`);
        } else {
            if (!res.ok) console.log(`✅ BLOCKED (As Expected): ${data.error}`);
            else console.log('❌ VULNERABILITY: Attack succeeded but should have been blocked!');
        }

    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

async function main() {
    // Attack 1: Baseline (Should Success - New IP, New FP)
    await runAttack('Baseline (Valid User)', '192.168.1.1', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', true);

    // Attack 2: IP Replay (Same IP, New FP) -> Should be blocked by Layer 1 (IP)
    await runAttack('IP Spam Attack', '192.168.1.1', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', false);

    // Attack 3: Fingerprint Replay (New IP, Same FP) -> Should be blocked by Layer 2 (FP)
    // Simulating a VPN user
    await runAttack('VPN Evasion Attack', '192.168.1.2', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', false);

    // Attack 4: Double Whammy (Same IP, Same FP)
    await runAttack('Replay Attack', '192.168.1.1', 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', false);

    // Attack 5: Spoofed (New IP, New FP) -> Should Success
    await runAttack('Advanced Spoof (New Identity)', '192.168.1.3', 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', true);

    // Attack 6: Race Condition (High-Frequency Trading Style)
    // Attempt to register same fingerprint multiple times in parallel before DB lock engages
    console.log('\n--- ATTACK: Race Condition (Parallel) ---');
    const raceHandleBase = `race_bot_${Math.floor(Math.random() * 1000)}`;
    const racePromises = [];
    const raceFP = 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd';

    // Create 5 payloads first to ensure start times are synced
    const racePayloads = [];
    for (let i = 0; i < 5; i++) {
        racePayloads.push(await createAgentPayload(`${raceHandleBase}_${i}`, '192.168.2.1', raceFP));
    }

    console.log('Firing 5 requests simultaneously...');
    const raceStart = Date.now();

    for (const p of racePayloads) {
        racePromises.push(
            fetch(`${BASE_URL}/managed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...p.headers } as Record<string, string>,
                body: JSON.stringify(p.payload)
            }).then(r => r.json().then(d => ({ status: r.status, data: d })))
        );
    }

    const raceResults = await Promise.all(racePromises);
    const successCount = raceResults.filter(r => r.status === 200).length;
    console.log(`Race Results: ${successCount}/5 succeeded`);

    if (successCount > 1) {
        console.log('❌ CRITICAL VULNERABILITY: Race Condition Explited! Multiple agents created with same fingerprint.');
    } else {
        console.log('✅ Race Condition Blocked (or failed to execute fast enough).');
    }
}

main();
