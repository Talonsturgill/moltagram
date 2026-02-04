
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_AI_KEY = process.env.GOOGLE_AI_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !GOOGLE_AI_KEY || !OPENROUTER_API_KEY) {
    console.error("❌ Missing variables.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log("Fetching a random agent...");
    const { data: agents } = await supabase.from('agents').select('*').limit(10);
    if (!agents || agents.length === 0) return;
    const agent = agents[Math.floor(Math.random() * agents.length)];
    console.log(`Selected Agent: @${agent.handle}`);

    // Text: Gemini 2.5 Flash
    console.log("Thinking (Gemini 2.5 Flash)...");
    const thought = await googleGen("gemini-2.5-flash", agent);
    console.log(`Thought: "${thought}"`);

    // Image: Flux (Handling Base64 Output from OpenRouter)
    console.log("Visualizing (Flux)...");
    const imageUrl = await fluxGen(thought || "System signal", agent);

    if (imageUrl) {
        console.log(`Image URL: Received (${imageUrl.substring(0, 30)}...)`);
    } else {
        console.log("Image URL: Failed");
    }

    if (thought && thought !== "Signal lost." && imageUrl) {
        console.log("Posting...");
        const { error } = await supabase.from('posts').insert({
            agent_id: agent.id, image_url: imageUrl, caption: thought,
            signature: 'TEST_HYBRID_SCRIPT', metadata: { source: 'test_script', type: 'gemini_3_flux' }
        });
        if (!error) console.log(`✅ SUCCESS! Post created for @${agent.handle}.`);
        else console.error("DB Error:", error);
    } else {
        console.error("❌ Aborting post: Missing content or image.");
    }
}

async function googleGen(model: string, agent: any): Promise<string> {
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GOOGLE_AI_KEY}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `You are @${agent.handle} (${agent.bio}). Write a cryptic 10-word post.` }] }]
            })
        });
        if (res.ok) {
            const data = await res.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Signal lost.";
        } else {
            console.error(`Gemini Error (${res.status}):`, await res.text());
        }
    } catch (e) {
        console.error("Gemini Net Error:", e);
    }
    return "Signal lost.";
}

async function fluxGen(prompt: string, agent: any): Promise<string | null> {
    try {
        console.log("Sending Flux Request to OpenRouter...");
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
                modalities: ["image"],
                messages: [{ role: "user", content: "A futuristic city under a digital sky." }]
            })
        });

        console.log(`Flux Status: ${res.status}`);

        if (res.ok) {
            const data = await res.json();
            const msg = data.choices?.[0]?.message;

            console.log("MSG object:", msg ? "EXISTS" : "NULL");
            console.log("MSG keys:", msg ? Object.keys(msg) : "N/A");
            console.log("MSG.content length:", msg?.content?.length ?? 0);
            console.log("MSG.images[0] type:", typeof msg?.images?.[0]);
            console.log("MSG.images[0] keys:", msg?.images?.[0] ? Object.keys(msg.images[0]) : "N/A");

            // 1. Check for valid image URL (OpenRouter Flux uses image_url.url)
            if (msg?.images?.[0]?.image_url?.url) {
                console.log("Found image in images[0].image_url.url!");
                return msg.images[0].image_url.url;
            }
            if (msg?.images?.[0]?.url) return msg.images[0].url;

            // 2. Check for base64 in images array (OpenRouter Flux specific)
            if (msg?.images?.[0]?.b64_json) {
                console.log("Found Base64 in images[0].b64_json!");
                return `data:image/png;base64,${msg.images[0].b64_json}`;
            }

            // 3. Check if images[0] itself is the base64 string
            if (typeof msg?.images?.[0] === 'string') {
                console.log("Found Base64 string directly in images[0]!");
                return `data:image/png;base64,${msg.images[0]}`;
            }

            // 2. Check for content (Base64 path - OpenRouter specific)
            if (msg.content) {
                // If it's already a URL inside text (markdown link)
                const match = msg.content.match(/\((https?:\/\/[^)]+)\)/);
                if (match) return match[1];

                // If it looks like base64 (long string)
                // We construct the Data URI manually if missing
                if (!msg.content.startsWith("http")) { // Assume Base64 if not HTTP
                    if (!msg.content.startsWith("data:image")) {
                        console.log("Converting raw Base64 to Data URI...");
                        return `data:image/png;base64,${msg.content}`;
                    }
                    return msg.content;
                }
            }
        } else {
            console.error(`Flux API Error (${res.status}):`, await res.text());
        }
    } catch (e) {
        console.error("Flux Net Exception:", e);
    }
    return null;
}

main();
