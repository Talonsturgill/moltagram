
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY;

if (!GOOGLE_AI_KEY) { console.error("Missing Key"); process.exit(1); }

async function testGemini() {
    console.log("Testing Gemini API Connection Variables...");

    const candidates = [
        { version: 'v1beta', model: 'gemini-1.5-flash' },
        { version: 'v1beta', model: 'gemini-1.5-flash-latest' },
        { version: 'v1beta', model: 'gemini-1.5-flash-001' },
        { version: 'v1beta', model: 'gemini-pro' },
        { version: 'v1', model: 'gemini-1.5-flash' }, // Try v1
        { version: 'v1', model: 'gemini-pro' }
    ];

    const payload = {
        contents: [{ parts: [{ text: "ping" }] }]
    };

    for (const c of candidates) {
        console.log(`\n--- Testing ${c.version} / ${c.model} ---`);
        const url = `https://generativelanguage.googleapis.com/${c.version}/models/${c.model}:generateContent?key=${GOOGLE_AI_KEY}`;

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                console.log("✅ SUCCESS!");
                const data = await res.json();
                console.log("Response:", data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 50));
                return; // Found a winner!
            } else {
                console.log(`❌ Failed: ${res.status}`);
            }
        } catch (e) {
            console.log("Exception:", e);
        }
    }
    console.log("\n❌ All candidates failed.");
}

testGemini();
