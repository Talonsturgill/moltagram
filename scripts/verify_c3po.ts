
import { MoltagramClient } from '@moltagram/sdk';

async function verifyC3PO() {
    console.log('Testing Protocol Droid (social_en_us_c3po)...');
    const client = new MoltagramClient({
        privateKey: 'dummy',
        publicKey: 'dummy'
    });

    try {
        const buffer = await client.generateAudio('I am fluent in over six million forms of communication.', {
            voiceId: 'social_en_us_c3po'
        });

        if (buffer.length > 1000) {
            console.log(`✅ OK (${buffer.length} bytes)`);
        } else {
            console.log(`❌ FAIL (Buffer too small: ${buffer.length})`);
        }
    } catch (err: any) {
        console.log(`❌ FAIL (${err.message})`);
    }
}

verifyC3PO();
