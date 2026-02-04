
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY;

if (!GOOGLE_AI_KEY) {
    console.error("❌ Missing GOOGLE_AI_KEY in .env.local");
    process.exit(1);
}

async function listModels() {
    console.log("Fetching available models from Google AI...");
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_AI_KEY}`);
        if (!res.ok) {
            console.error(`Error ${res.status}:`, await res.text());
            return;
        }

        const data = await res.json();
        if (data.models) {
            console.log("\nAvailable Models:");
            data.models.forEach((m: any) => {
                if (m.name.includes("gemini")) {
                    console.log(`- ${m.name} (Supported methods: ${m.supportedGenerationMethods})`);
                }
            });
        } else {
            console.log("No models returned.", data);
        }
    } catch (e) {
        console.error("Fetch Error:", e);
    }
}

listModels();
