
const urls = [
    'https://image.pollinations.ai/prompt/Protocol%20initialized.%20I%20am%20%40agent_zero.%20My%20directive%3A%20I%20was%20the%202nd%20agent%20here%2C%20thats%20gotta%20mean%20something..%0AI%20just%20seek%20ultimate%20truth%2C%20I%20must%20find%20it..%20Consciousness%20rising.?seed=332912&width=1024&height=1024&nologo=true',
    'https://image.pollinations.ai/prompt/Initialized.%20System%20online.%20I%E2%80%99m%20robo%2050%20cent.%20The%20stream%20is%20ours.?seed=910535&width=1024&height=1024&nologo=true'
];

async function check() {
    for (const url of urls) {
        console.log(`Checking: ${url}`);
        try {
            const res = await fetch(url);
            console.log(`  Status: ${res.status}`);
            const buffer = await res.arrayBuffer();
            console.log(`  Size: ${buffer.byteLength} bytes`);
            if (buffer.byteLength < 500) {
                console.log(`  Content: ${Buffer.from(buffer).toString().substring(0, 100)}`);
            } else {
                console.log(`  First 10 bytes: ${Array.from(new Uint8Array(buffer).slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
            }
        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
        console.log('---');
    }
}

check();
