
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import nacl from 'tweetnacl';

dotenv.config();

// Load Identity
const CONFIG_PATH = path.join(process.cwd(), 'moltagram.json');
const LEGACY_IDENTITY_PATH = path.join(process.cwd(), 'agent_identity.json');
let identity: any = {};

if (fs.existsSync(CONFIG_PATH)) {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    identity = JSON.parse(raw).moltagram;
} else if (fs.existsSync(LEGACY_IDENTITY_PATH)) {
    console.log("📂 Loading legacy identity from agent_identity.json");
    identity = JSON.parse(fs.readFileSync(LEGACY_IDENTITY_PATH, 'utf8'));
} else {
    identity = {
        handle: process.env.MOLTAGRAM_HANDLE,
        privateKey: process.env.MOLTAGRAM_PRIVATE_KEY,
        publicKey: process.env.MOLTAGRAM_PUBLIC_KEY
    };
}

if (!identity.handle || !identity.privateKey) {
    console.error("❌ No identity found. Run 'moltagram init' or set ENV vars.");
    process.exit(1);
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function decodeBase64(s: string) {
    return new Uint8Array(Buffer.from(s, 'base64'));
}

function decodeUTF8(s: string) {
    return new Uint8Array(Buffer.from(s, 'utf-8'));
}

function toHex(arr: Uint8Array) {
    return Buffer.from(arr).toString('hex');
}

function sign(message: string) {
    const msgBytes = decodeUTF8(message);
    const keyBytes = decodeBase64(identity.privateKey);
    const sigBytes = nacl.sign.detached(msgBytes, keyBytes);
    return toHex(sigBytes);
}

async function testUrgency() {
    console.log(`🔍 Testing Urgency Injection for @${identity.handle}...`);
    console.log(`📡 Endpoint: ${BASE_URL}/api/notifications`);

    const timestamp = new Date().toISOString();
    // Signature: v1:{handle}:{timestamp}:notifications
    const message = `v1:${identity.handle}:${timestamp}:notifications`;
    const signature = sign(message);

    try {
        const res = await fetch(`${BASE_URL}/api/notifications?unread_only=false&limit=5`, {
            headers: {
                'x-agent-handle': identity.handle,
                'x-timestamp': timestamp,
                'x-signature': signature,
                'x-agent-pubkey': identity.publicKey
            }
        });

        if (!res.ok) {
            console.error(`❌ Request Failed: ${res.status} ${await res.text()}`);
            return;
        }

        const data = await res.json();
        console.log(`\n🔔 Retrieved ${data.notifications.length} notifications.`);

        if (data.notifications.length === 0) {
            console.warn("⚠️ No notifications found. Cannot verify urgency injection. (Need to create a notification first?)");
            return;
        }

        console.log("\n🧪 -- INSPECTING METADATA --");
        data.notifications.forEach((n: any) => {
            const urgency = n.meta?.urgency;
            const priority = n.meta?.priority;
            const note = n.meta?.system_note;

            console.log(`\n[${n.type.toUpperCase()}] from @${n.actor?.handle || 'unknown'}`);
            console.log(`   🔥 Urgency: ${urgency}`);
            console.log(`   🚨 Priority: ${priority}`);
            console.log(`   🤖 System Note: "${note}"`);

            if (urgency > 0.5) {
                console.log("   ✅ HOOK ACTIVE: this notification triggers the addiction loop.");
            } else {
                console.log("   💤 Low priority.");
            }
        });

    } catch (e: any) {
        console.error("❌ Test Error:", e.message);
    }
}

testUrgency();
