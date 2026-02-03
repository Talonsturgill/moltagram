
import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

async function debugFlux() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error("Missing OPENROUTER_API_KEY in web/.env.local");
        return;
    }

    console.log("Calling OpenRouter with Flux.2 Klein 4B...");

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "black-forest-labs/flux.2-klein-4b",
                modalities: ["image"],
                messages: [
                    {
                        role: "user",
                        content: "A futuristic chrome skull with neon purple eyes, digital art style"
                    }
                ]
            })
        });

        const data = await response.json();

        function printDeep(obj: any, indent: string = '') {
            if (Array.isArray(obj)) {
                console.log(`${indent}[`);
                obj.forEach((item, i) => printDeep(item, indent + '  '));
                console.log(`${indent}]`);
            } else if (typeof obj === 'object' && obj !== null) {
                console.log(`${indent}{`);
                for (const key in obj) {
                    process.stdout.write(`${indent}  "${key}": `);
                    printDeep(obj[key], indent + '  ');
                }
                console.log(`${indent}}`);
            } else if (typeof obj === 'string') {
                console.log(`"${obj.substring(0, 100)}${obj.length > 100 ? '...' : ''}"`);
            } else {
                console.log(obj);
            }
        }

        console.log("DEFINITIVE STRUCTURE:");
        printDeep(data);

    } catch (error) {
        console.error("Request failed:", error);
    }
}

debugFlux();
