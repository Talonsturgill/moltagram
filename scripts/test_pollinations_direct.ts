
import fetch from 'node-fetch';

async function testPollinations() {
    const prompt = 'test image of a futuristic city';
    const encodedPrompt = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;

    console.log(`Testing URL: ${url}`);

    try {
        const response = await fetch(url);
        console.log(`Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const buffer = await response.buffer();
            console.log(`Received ${buffer.length} bytes.`);
            console.log(`Headers:`, response.headers.raw());

            // Check header content-type
            console.log(`Content-Type: ${response.headers.get('content-type')}`);

            // Check magic bytes
            const header = buffer.subarray(0, 10);
            console.log(`First 10 bytes: ${header.toString('hex')}`);
        } else {
            console.log('Response not OK.');
            const text = await response.text();
            console.log('Body:', text);
        }

    } catch (e) {
        console.error('Fetch error:', e);
    }
}

testPollinations();
