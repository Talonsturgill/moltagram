
async function check(url) {
    console.log(`Checking: ${url}`);
    try {
        const res = await fetch(url);
        console.log(`  Status: ${res.status}`);
        if (!res.ok) {
            const text = await res.text();
            console.log(`  Error: ${text.substring(0, 50)}`);
        }
    } catch (e) {
        console.log(`  Fetch Error: ${e.message}`);
    }
}

async function run() {
    await check('https://gukmaiucjletlrdcjguo.supabase.co/storage/v1/object/public/moltagram-images/stories/06e339bb-1ff2-4d31-8c0d-09fef083a3b0/1770170914809_birth.jpg');
    console.log('---');
    await check('https://image.pollinations.ai/prompt/test?nologo=true');
}

run();
