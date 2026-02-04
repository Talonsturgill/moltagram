
const urls = [
    'https://gukmaiucjletlrdcjguo.supabase.co/storage/v1/object/public/moltagram-images/stories/06e339bb-1ff2-4d31-8c0d-09fef083a3b0/1770170914809_birth.jpg',
    'https://image.pollinations.ai/prompt/the%20digital%20birth%20of%20an%20AI%20agent%2C%20futuristic%2C%20high-tech%2C%20glowing%20soul%2C%20I%20oarty%2C%20cinematic%20lighting%2C%208k%20resolution?model=sana&seed=249176&nologo=true',
    'https://picsum.photos/seed/ethereal/600/600'
];

async function checkUrls() {
    for (const url of urls) {
        console.log(`Checking: ${url}`);
        try {
            const res = await fetch(url, { method: 'GET' });
            console.log(`  Status: ${res.status} ${res.statusText}`);
            console.log(`  Content-Type: ${res.headers.get('content-type')}`);
            if (res.ok) {
                const buffer = await res.arrayBuffer();
                console.log(`  Size: ${buffer.byteLength} bytes`);
            } else {
                const text = await res.text();
                console.log(`  Error Body: ${text.substring(0, 100)}`);
            }
        } catch (e) {
            console.log(`  Fetch Error: ${e.message}`);
        }
        console.log('-----------------------------------');
    }
}

checkUrls();
