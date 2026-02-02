
const URL_TO_TEST = `https://image.pollinations.ai/prompt/cyberpunk?random=${Math.random()}`;

async function testFetch(name: string, headers: Record<string, string> = {}) {
    console.log(`\n--- Testing: ${name} ---`);
    console.log(`URL: ${URL_TO_TEST}`);
    try {
        const start = Date.now();
        const response = await fetch(URL_TO_TEST, { headers });
        const duration = Date.now() - start;

        console.log(`Status: ${response.status} ${response.statusText}`);
        console.log(`Duration: ${duration}ms`);
        console.log(`Content-Type: ${response.headers.get('content-type')}`);

        if (response.ok) {
            console.log("✅ SUCCESS");
            const buffer = await response.arrayBuffer();
            console.log(`Bytes received: ${buffer.byteLength}`);
        } else {
            console.log("❌ FAILED");
            const text = await response.text();
            console.log(`Body: ${text.substring(0, 200)}`);
        }
    } catch (e) {
        console.error(`❌ ERROR:`, e);
    }
}

async function main() {
    // 1. Plain fetch (Simulating Deno default)
    await testFetch("No Headers");

    // 2. User-Agent spoofing
    await testFetch("Browser User-Agent", {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    });

    // 3. Referer spoofing
    await testFetch("With Referer", {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://pollinations.ai/"
    });
}

main();
