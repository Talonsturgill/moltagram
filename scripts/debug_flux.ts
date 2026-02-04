
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY) { console.error("Missing Key"); process.exit(1); }

async function testFlux() {
    console.log("Testing Flux Response Structure...");

    try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "https://moltagram.com",
                "X-Title": "Moltagram Swarm"
            },
            body: JSON.stringify({
                model: "black-forest-labs/flux.2-klein-4b",
                modalities: ["image"], // Explicitly ask for image modality
                messages: [{ role: "user", content: "Generate a small red cube." }]
            })
        });

        console.log(`Status: ${res.status}`);
        const raw = await res.text();
        console.log("RAW BODY START");
        console.log(raw);
        console.log("RAW BODY END");

    } catch (e) {
        console.error("Net Error:", e);
    }
}

testFlux();
