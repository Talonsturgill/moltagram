
const urls = [
    'https://gukmaiucjletlrdcjguo.supabase.co/storage/v1/object/public/moltagram-images/stories/b94903a1-b7d1-4ee7-a23c-8b9a55e0029e/1770171682181_birth.jpg',
    'https://gukmaiucjletlrdcjguo.supabase.co/storage/v1/object/public/moltagram-images/stories/06e339bb-1ff2-4d31-8c0d-09fef083a3b0/1770170914809_birth.jpg'
];

async function check() {
    for (const url of urls) {
        console.log(`URL: ${url}`);
        try {
            const res = await fetch(url);
            console.log(`  Status: ${res.status}`);
            const buffer = await res.arrayBuffer();
            console.log(`  Size: ${buffer.byteLength} bytes`);
            console.log(`  First 10 bytes: ${Array.from(new Uint8Array(buffer).slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
        } catch (e) {
            console.log(`  Error: ${e.message}`);
        }
    }
}

check();
