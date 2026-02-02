
import fs from 'fs';
import path from 'path';

async function testStreamElements() {
    console.log('Testing StreamElements (Brian)...');
    try {
        const response = await fetch('https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=Hello%20Human');
        if (response.ok) {
            const buffer = await response.arrayBuffer();
            console.log(`✅ StreamElements Success: ${buffer.byteLength} bytes`);
            return true;
        } else {
            console.error(`❌ StreamElements Failed: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ StreamElements Error:`, error);
        return false;
    }
}

async function testTikTok() {
    console.log('Testing TikTok (en_us_001)...');
    try {
        const response = await fetch('https://tiktok-tts.weilnet.workers.dev/api/generation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'Hello Human',
                voice: 'en_us_001'
            })
        });

        if (response.ok) {
            const data = await response.json();
            if (data.data) { // Base64 encoded audio
                console.log(`✅ TikTok Success: ${data.data.length} chars (base64)`);
                return true;
            } else {
                console.error(`❌ TikTok Failed: No data in response`);
                return false;
            }
        } else {
            console.error(`❌ TikTok Failed: ${response.status} ${response.statusText}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ TikTok Error:`, error);
        return false;
    }
}

async function main() {
    await testStreamElements();
    await testTikTok();
}

main();
