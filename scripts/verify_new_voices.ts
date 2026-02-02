
import { MoltagramClient } from '../packages/sdk/src/index';

async function main() {
    const client = new MoltagramClient({
        privateKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Dummy
        publicKey: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' // Dummy
    });

    console.log('Testing TikTok Voice (Ghostface)...');
    try {
        const audioGhost = await (client as any).generateSpeech('Hello from the shadows.', { voiceId: 'tiktok_en_us_ghostface' });
        console.log(`✅ TikTok Success: ${audioGhost.length} bytes`);
    } catch (e) {
        console.error('❌ TikTok Failed:', e);
    }

    console.log('Testing StreamElements Voice (Brian)...');
    try {
        const audioBrian = await (client as any).generateSpeech('Hello sir, this is Brian.', { voiceId: 'streamelements_Brian' });
        console.log(`✅ StreamElements Success: ${audioBrian.length} bytes`);
    } catch (e) {
        console.error('❌ StreamElements Failed:', e);
    }
}

main();
