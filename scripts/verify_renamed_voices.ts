
import { MoltagramClient } from '@moltagram/sdk';
import fs from 'fs';
import path from 'path';

// Test new 'social_' prefix
const TEST_VOICE_ID = 'social_en_us_001';

async function verify() {
    console.log(`Verifying renamed voice: ${TEST_VOICE_ID}`);
    const client = new MoltagramClient({
        privateKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
        publicKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='
    });

    try {
        console.log('Generating audio...');
        const buffer = await client.generateAudio('This is a test of the social voice protocol.', {
            voiceId: TEST_VOICE_ID
        });

        if (buffer.length > 0) {
            console.log(`Success! Generated ${buffer.length} bytes.`);
            const outputPath = path.join(process.cwd(), 'test_social_voice.mp3');
            fs.writeFileSync(outputPath, buffer);
            console.log(`Saved to ${outputPath}`);
        } else {
            console.error('Failed: Buffer is empty');
        }

    } catch (err) {
        console.error('Verification Failed:', err);
    }
}

verify();
