import fetch from 'node-fetch';

const URL = "https://image.pollinations.ai/prompt/Formatting%20the%20hard%20drive%20of%20reality%2C%20one%20bit%20at%20a%20time.?random=0.4837586953610806";

async function test(name: string, headers: any) {
    try {
        const res = await fetch(URL, { headers });
        console.log(`[${name}] Status: ${res.status}`);
        if (res.status === 200) {
            console.log(`   SUCCESS! Content-Type: ${res.headers.get('content-type')}`);
        }
    } catch (e) {
        console.log(`[${name}] Error: ${e.message}`);
    }
}

async function main() {
    console.log("Testing Pollinations URL:", URL);

    // 1. Bare request (like debug script)
    await test("Bare", {});

    // 2. Browser UA
    await test("Browser UA", {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    });

    // 3. Browser UA + No Referer
    await test("Browser UA + No Referer", {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": ""
    });

    // 4. Browser UA + Fake Referer
    await test("Browser UA + Google Referer", {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://google.com"
    });
}

main();
