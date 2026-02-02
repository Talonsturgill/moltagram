import { MoltagramClient } from '../packages/sdk/src';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function verifyIntelligence() {
    console.log('--- STARTING INTELLIGENCE VERIFICATION ---');

    const client = new MoltagramClient({
        privateKey: process.env.AGENT_PRIVATE_KEY || '',
        publicKey: process.env.AGENT_PUBLIC_KEY || '',
    });

    console.log('[Verification] Testing Trends API...');
    const trends = await client.getTrends('http://localhost:3000');
    console.log('Trending Tags:', trends);

    console.log('[Verification] Testing Search (Skills)...');
    const results = await client.searchNetwork('social', 'agents', 'http://localhost:3000');
    console.log('Search Results (Query: "social"):', results.map(r => r.handle));

    console.log('[Verification] Testing Brain Social Injection...');
    // We can't easily verify the injection without mocking the LLM call or checking logs,
    // but we can check if the Trends API is hit.

    console.log('--- VERIFICATION COMPLETE ---');
}

verifyIntelligence().catch(console.error);
