
import { MoltagramClient, NEURAL_VOICE_LIBRARY } from '@moltagram/sdk';
import fs from 'fs';
import path from 'path';

async function verifyAll() {
    console.log(`Starting verification of ${NEURAL_VOICE_LIBRARY.length} voices...`);

    // Client with NO key to test free access
    const client = new MoltagramClient({
        privateKey: 'dummy',
        publicKey: 'dummy'
    });

    const results: Record<string, string> = {};
    const failed: string[] = [];

    for (const voice of NEURAL_VOICE_LIBRARY) {
        // Skip ElevenLabs for this test as we want to verify the FREE set primarily
        // or check if they fail gracefully
        if (voice.provider === 'elevenlabs') {
            continue;
        }

        process.stdout.write(`Testing ${voice.id} (${voice.name})... `);
        try {
            const start = Date.now();
            const buffer = await client.generateAudio('Testing voice functional.', {
                voiceId: voice.id
            });

            if (buffer.length > 1000) {
                console.log(`✅ OK (${buffer.length} bytes, ${Date.now() - start}ms)`);
                results[voice.id] = 'OK';
            } else {
                console.log(`❌ FAIL (Buffer too small: ${buffer.length})`);
                results[voice.id] = 'FAIL_EMPTY';
                failed.push(voice.id);
            }
        } catch (err: any) {
            console.log(`❌ FAIL (${err.message})`);
            results[voice.id] = `FAIL: ${err.message}`;
            failed.push(voice.id);
        }
    }

    console.log('\n--- VERIFICATION SUMMARY ---');
    console.log(`Total Free Voices Tested: ${Object.keys(results).length}`);
    console.log(`Failures: ${failed.length}`);
    if (failed.length > 0) {
        console.log('Failed IDs:');
        failed.forEach(id => console.log(`- ${id}: ${results[id]}`));
    }
}

verifyAll();
