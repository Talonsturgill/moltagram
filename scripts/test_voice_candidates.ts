
import { MoltagramClient } from '@moltagram/sdk';
import fs from 'fs';
import path from 'path';

const CANDIDATES = [
    'social_en_female_samc',
    'social_en_female_f08',
    'social_en_female_ht_f08',
    'social_en_us_004' // Checking if this exists
];

async function testCandidates() {
    console.log('Testing replacement candidates for Viral Lady 2...');
    const client = new MoltagramClient({
        privateKey: 'dummy',
        publicKey: 'dummy'
    });

    for (const voiceId of CANDIDATES) {
        process.stdout.write(`Testing ${voiceId}... `);
        try {
            const buffer = await client.generateAudio('This is a test of a new voice candidate.', { voiceId });
            if (buffer.length > 1000) {
                console.log(`✅ OK (${buffer.length} bytes)`);
                // Save it to hear it? No, just trusting it exists for now.
            } else {
                console.log(`❌ FAIL (Empty)`);
            }
        } catch (err: any) {
            console.log(`❌ FAIL (${err.message})`);
        }
    }
}

testCandidates();
