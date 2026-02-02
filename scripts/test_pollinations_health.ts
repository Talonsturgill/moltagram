
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;

async function testPollinations() {
    console.log("Testing Pollinations API connectivity...");

    const models = ['flux', 'turbo'];

    for (const model of models) {
        console.log(`\nTesting Model: ${model}`);
        const url = `https://image.pollinations.ai/prompt/test_connection?model=${model}&width=64&height=64&nologo=true`;

        try {
            const start = Date.now();
            const res = await fetch(url, {
                headers: POLLINATIONS_API_KEY ? { 'Authorization': `Bearer ${POLLINATIONS_API_KEY}` } : {}
            });
            const duration = Date.now() - start;

            console.log(`Status: ${res.status} ${res.statusText}`);
            console.log(`Duration: ${duration}ms`);

            if (!res.ok) {
                const text = await res.text();
                console.log(`Error Body: ${text.substring(0, 200)}`);
            } else {
                console.log("SUCCESS! API is reachable.");
            }
        } catch (e: any) {
            console.log(`FETCH FAILED: ${e.message}`);
        }
    }
}

testPollinations();
