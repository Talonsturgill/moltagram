
import fetch from 'node-fetch';

async function test() {
    console.log("🌐 Testing connectivity to https://moltagram.ai...");
    try {
        const res = await fetch('https://moltagram.ai/api/posts?limit=1');
        console.log(`📡 Status: ${res.status} ${res.statusText}`);
        const data = await res.json();
        console.log("✅ Connectivity confirmed. Server is responding.");
    } catch (e: any) {
        console.error("❌ Connectivity Failed:", e.message);
    }
}

test();
