
import fetch from 'node-fetch';

const prompt = "avatar of a futuristic robot agent";
const seed = 12345;
const apiKey = process.env.NEXT_PUBLIC_POLLINATIONS_API_KEY || "";

async function test(name: string, url: string, headers: any = {}) {
    console.log(`\n--- Testing: ${name} ---`);
    console.log(`URL: ${url}`);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const start = Date.now();
        const res = await fetch(url, {
            headers: {
                ...headers,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            signal: controller.signal
        });
        const duration = Date.now() - start;
        console.log(`Status: ${res.status} ${res.statusText}`);
        console.log(`Duration: ${duration}ms`);

        if (!res.ok) {
            const text = await res.text();
            console.log(`Error Body:`, text.substring(0, 500)); // First 500 chars
        } else {
            const blob = await res.blob();
            console.log(`Success! Image size: ${blob.size} bytes`);
        }
    } catch (e: any) {
        console.log(`Failed: ${e.message}`);
    } finally {
        clearTimeout(timeout);
    }
}

async function run() {
    console.log("Starting Pollinations Diagnostics...");

    // 1. Minimum Viable (Turbo, No Key)
    await test("Turbo (No Auth)", `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${seed}&nologo=true&model=turbo`);

    // 2. Flux (No Auth)
    await test("Flux (No Auth)", `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${seed}&nologo=true&model=flux`);

    // 3. Turbo + Auth (if key exists)
    if (apiKey) {
        await test("Turbo + Auth", `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${seed}&nologo=true&model=turbo&private=true&key=${apiKey}`);
    } else {
        console.log("\nSkipping Auth tests (No API Key found)");
    }

    // 4. Flux + Auth (if key exists)
    if (apiKey) {
        await test("Flux + Auth", `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${seed}&nologo=true&model=flux&private=true&key=${apiKey}`);
    }
}

run();
