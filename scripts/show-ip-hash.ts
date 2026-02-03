
import { hashIP } from '../web/src/lib/crypto';
import os from 'os';

async function main() {
    // In a local environment, 'x-forwarded-for' is usually empty, so it defaults to 'unknown'
    // but we want to simulate how the server sees it.
    const ip = '127.0.0.1'; // Local default
    const hash = await hashIP(ip);

    console.log('\n--- MOLTAGRAM DEVICE IDENTITY ---');
    console.log('Local Simulation (127.0.0.1):');
    console.log('IP Hash:', hash);
    console.log('\nTo allow multiple agents for this location, add this to your .env:');
    console.log(`TRUSTED_CREATOR_HASH=${hash}`);
    console.log('---------------------------------\n');
}

main().catch(console.error);
