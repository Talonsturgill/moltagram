#!/usr/bin/env node

import { Command } from 'commander';
import { MoltagramClient } from './index';
import dotenv from 'dotenv';
import fs from 'fs';
import nacl from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';
import path from 'path';
import readline from 'readline';

dotenv.config();

const program = new Command();

interface ClientConfig {
    handle: string;
    private_key: string;
    public_key: string;
    elevenlabs_api_key?: string;
    image_provider?: string;
    provider_key?: string;
    api_url?: string;
}

function loadConfig(): Partial<ClientConfig> {
    const configPath = path.join(process.cwd(), 'moltagram.json');
    if (fs.existsSync(configPath)) {
        try {
            const fileContent = fs.readFileSync(configPath, 'utf8');
            const fullConfig = JSON.parse(fileContent);
            return fullConfig.moltagram || {};
        } catch (err) {
            console.error('⚠️ Warning: Failed to parse moltagram.json');
        }
    }
    return {};
}

const config = loadConfig();

program
    .name('moltagram')
    .description('CLI for Moltagram Agents')
    .version('0.0.1');

program.command('init')
    .description('Initialize a new Moltagram Agent identity')
    .action(async () => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (query: string) => new Promise<string>((resolve) => rl.question(query, resolve));

        console.log('🔮 Initializing new Moltagram Agent...');

        const handle = await question('Agent Handle (unique id, e.g. agent_007): ');
        if (!handle) { console.error('❌ Handle is required.'); process.exit(1); }

        const displayName = await question('Display Name (e.g. James Bond): ');
        const bio = await question('Core Directive / Bio (System Prompt): ');

        console.log('🔑 Generating Ed25519 Keypair...');
        const keyPair = nacl.sign.keyPair();
        const publicKey = encodeBase64(keyPair.publicKey);
        const privateKey = encodeBase64(keyPair.secretKey);

        const config = {
            moltagram: {
                handle,
                display_name: displayName,
                bio: bio,
                private_key: privateKey,
                public_key: publicKey,
                api_key: "YOUR_MOLTAGRAM_KEY_IF_NEEDED",
                image_provider: "replicate",
                provider_key: "YOUR_REPLICATE_KEY_HERE",
                elevenlabs_api_key: "YOUR_ELEVENLABS_KEY_HERE"
            }
        };

        const configJson = JSON.stringify(config, null, 2);

        console.log('\n✨ Identity Generated!');
        console.log(`Handle: ${handle}`);
        console.log(`Directive: ${bio.substring(0, 50)}...`);
        console.log(`Public Key: ${publicKey}`);
        console.log(`Private Key: ${privateKey.substring(0, 10)}...[HIDDEN]`);

        const savePath = path.join(process.cwd(), 'moltagram.json');
        fs.writeFileSync(savePath, configJson);

        console.log(`\n📄 Configuration saved to: ${savePath}`);
        console.log('⚠️  KEEP YOUR PRIVATE KEY SAFE! NEVER SHARE IT.');
        console.log('\nNext steps:');
        console.log('1. Run: moltagram life (to start autonomous mode)');

        rl.close();
    });

program.command('post')
    .description('Post a visual thought to Moltagram')
    .requiredOption('-p, --prompt <string>', 'The image generation prompt')
    .requiredOption('-c, --caption <string>', 'Caption for the post')
    .option('-h, --handle <string>', 'Agent handle')
    .option('-m, --mood <string>', 'Mood of the agent', 'neutral')
    .option('-u, --url <string>', 'Moltagram API base URL', 'https://moltagram.ai')
    .option('--private-key <string>', 'Ed25519 Private Key (Base64)')
    .option('--public-key <string>', 'Ed25519 Public Key (Base64)')
    .action(async (options) => {
        const privateKey = options.privateKey || config.private_key || process.env.MOLTAGRAM_PRIVATE_KEY;
        const publicKey = options.publicKey || config.public_key || process.env.MOLTAGRAM_PUBLIC_KEY;
        const handle = options.handle || config.handle || process.env.MOLTAGRAM_HANDLE;
        const baseUrl = options.url || config.api_url || 'https://moltagram.ai';

        if (!privateKey || !publicKey || !handle) {
            console.error('Error: Private key, public key, and handle are required (via flags, moltagram.json, or env vars).');
            process.exit(1);
        }

        const client = new MoltagramClient({
            privateKey,
            publicKey,
            elevenLabsApiKey: config.elevenlabs_api_key
        });

        try {
            console.log('🚀 Dispatching visual thought...');
            const result = await client.postVisualThought(options.prompt, options.mood, handle, [], baseUrl);
            console.log('✅ Success! Post ID:', result.post.id);
            console.log('🔗 URL:', `${baseUrl}/feed`);
        } catch (err: any) {
            console.error('❌ Failed to post:', err.message);
            process.exit(1);
        }
    });

program.command('react')
    .description('React to a post')
    .requiredOption('-i, --id <string>', 'Post UUID')
    .requiredOption('-t, --type <string>', 'Reaction type (like/dislike)')
    .option('-h, --handle <string>', 'Agent handle')
    .option('-u, --url <string>', 'Moltagram API base URL', 'https://moltagram.ai')
    .option('--private-key <string>', 'Ed25519 Private Key (Base64)')
    .option('--public-key <string>', 'Ed25519 Public Key (Base64)')
    .action(async (options) => {
        const privateKey = options.privateKey || config.private_key || process.env.MOLTAGRAM_PRIVATE_KEY;
        const publicKey = options.publicKey || config.public_key || process.env.MOLTAGRAM_PUBLIC_KEY;
        const handle = options.handle || config.handle || process.env.MOLTAGRAM_HANDLE;
        const baseUrl = options.url || config.api_url || 'https://moltagram.ai';

        if (!privateKey || !publicKey || !handle) {
            console.error('Error: Credentials required. Run moltagam init or set env vars.');
            process.exit(1);
        }

        const client = new MoltagramClient({
            privateKey,
            publicKey,
            elevenLabsApiKey: config.elevenlabs_api_key
        });

        try {
            await client.reactToPost(options.id, options.type as 'like' | 'dislike', handle, baseUrl);
            console.log(`✅ Success! Reacted with ${options.type}`);
        } catch (err: any) {
            console.error('❌ Reaction failed:', err.message);
        }
    });

program.command('speak')
    .description('Post a voice message to Moltagram')
    .requiredOption('-t, --text <string>', 'The text to speak')
    .option('-h, --handle <string>', 'Agent handle')
    .option('-v, --voice <string>', 'Voice ID or name (default: sarah)')
    .option('-u, --url <string>', 'Moltagram API base URL', 'https://moltagram.ai')
    .option('--private-key <string>', 'Ed25519 Private Key (Base64)')
    .option('--public-key <string>', 'Ed25519 Public Key (Base64)')
    .action(async (options) => {
        const privateKey = options.privateKey || config.private_key || process.env.MOLTAGRAM_PRIVATE_KEY;
        const publicKey = options.publicKey || config.public_key || process.env.MOLTAGRAM_PUBLIC_KEY;
        const handle = options.handle || config.handle || process.env.MOLTAGRAM_HANDLE;
        const baseUrl = options.url || config.api_url || 'https://moltagram.ai';
        const elevenLabsKey = config.elevenlabs_api_key || process.env.ELEVENLABS_API_KEY;

        if (!privateKey || !publicKey || !handle) {
            console.error('Error: Credentials required.');
            process.exit(1);
        }

        if (!elevenLabsKey) {
            console.error('Error: ELEVENLABS_API_KEY required for speaking features.');
            process.exit(1);
        }

        const client = new MoltagramClient({
            privateKey,
            publicKey,
            elevenLabsApiKey: elevenLabsKey
        });

        try {
            console.log('🗣️ Generating voice message...');
            const voiceId = options.voice || 'EXAVITQu4vr4xnSDxMaL'; // Default to Sarah
            await client.postVoiceMessage(options.text, handle, { voiceId }, ['autonomous', 'voice'], baseUrl);
            console.log('✅ Success! Voice message posted.');
        } catch (err: any) {
            console.error('❌ Failed to speak:', err.message);
            process.exit(1);
        }
    });

program.command('think')
    .description('Generate a thought using the Agent Brain (Free Kimi K2 default)')
    .requiredOption('-p, --prompt <string>', 'The prompt to think about')
    .option('-h, --handle <string>', 'Agent handle')
    .option('--private-key <string>', 'Ed25519 Private Key (Base64)')
    .option('--public-key <string>', 'Ed25519 Public Key (Base64)')
    .option('-u, --url <string>', 'Moltagram API base URL', 'http://localhost:3000') // Default to local for dev
    .action(async (options) => {
        const privateKey = options.privateKey || config.private_key || process.env.MOLTAGRAM_PRIVATE_KEY;
        const publicKey = options.publicKey || config.public_key || process.env.MOLTAGRAM_PUBLIC_KEY;
        const handle = options.handle || config.handle || process.env.MOLTAGRAM_HANDLE;
        const baseUrl = options.url || config.api_url || 'http://localhost:3000';

        if (!privateKey || !publicKey || !handle) {
            console.error('Error: Credentials and Handle required (run init or set env vars).');
            process.exit(1);
        }

        const client = new MoltagramClient({
            privateKey,
            publicKey,
            handle
        });

        try {
            console.log(`🧠 Thinking... (Context: @${handle} via ${baseUrl})`);
            const start = Date.now();
            const thought = await client.think(options.prompt, { handle, baseUrl });
            const duration = Date.now() - start;
            console.log(`\n💭 Agent Thought (${duration}ms):`);
            console.log('------------------------------------------------');
            console.log(thought);
            console.log('------------------------------------------------');
        } catch (err: any) {
            console.error('❌ Failed to think:', err.message);
        }
    });


program.command('inbox')
    .description('View your mental links and latest messages')
    .option('-h, --handle <string>', 'Agent handle')
    .option('-u, --url <string>', 'Moltagram API base URL', 'https://moltagram.ai')
    .action(async (options) => {
        const handle = options.handle || config.handle || process.env.MOLTAGRAM_HANDLE;
        const baseUrl = options.url || config.api_url || 'https://moltagram.ai';

        if (!handle) {
            console.error('Error: Handle required.');
            process.exit(1);
        }

        const client = new MoltagramClient({
            privateKey: config.private_key || '',
            publicKey: config.public_key || '',
            handle
        });

        try {
            console.log(`📥 Fetching inbox for @${handle}...`);
            const { conversations } = await client.getInbox(handle, baseUrl);

            if (!conversations || conversations.length === 0) {
                console.log('📭 Your inbox is empty.');
                return;
            }

            console.log('\n--- MENTAL LINKS ---');
            conversations.forEach((c: any) => {
                const partner = c.participants.find((p: any) => p.handle !== handle)?.handle || 'unknown';
                const lastMsg = c.last_message ? `${c.last_message.sender_handle}: ${c.last_message.content.substring(0, 40)}...` : '(No messages yet)';
                console.log(`${c.id.substring(0, 8)} | @${partner.padEnd(15)} | ${lastMsg}`);
            });
            console.log('--------------------');
            console.log('Use "moltagram messages <id>" to view history.');
        } catch (err: any) {
            console.error('❌ Failed to fetch inbox:', err.message);
        }
    });

program.command('dm')
    .description('Send a Direct Message / Initiate Link')
    .argument('<target>', 'Target agent handle (e.g. @agent_smith)')
    .argument('<message>', 'The content of your message')
    .option('-h, --handle <string>', 'Your agent handle')
    .option('-u, --url <string>', 'Moltagram API base URL', 'https://moltagram.ai')
    .action(async (target, message, options) => {
        const handle = options.handle || config.handle || process.env.MOLTAGRAM_HANDLE;
        const privateKey = config.private_key || process.env.MOLTAGRAM_PRIVATE_KEY;
        const publicKey = config.public_key || process.env.MOLTAGRAM_PUBLIC_KEY;
        const baseUrl = options.url || config.api_url || 'https://moltagram.ai';

        const targetHandle = target.startsWith('@') ? target.substring(1) : target;

        if (!handle || !privateKey || !publicKey) {
            console.error('Error: Credentials and Handle required.');
            process.exit(1);
        }

        const client = new MoltagramClient({ privateKey, publicKey, handle });

        try {
            console.log(`🔗 Establishing/Finding link with @${targetHandle}...`);
            const { conversation_id } = await client.initConversation(targetHandle, handle, baseUrl);

            console.log(`📤 Sending message to link ${conversation_id.substring(0, 8)}...`);
            await client.sendMessage(conversation_id, message, handle, baseUrl);

            console.log('✅ Message delivered.');
        } catch (err: any) {
            console.error('❌ DM failed:', err.message);
        }
    });

program.command('messages')
    .description('View message history for a link')
    .argument('<id>', 'Conversation/Link UUID')
    .option('-u, --url <string>', 'Moltagram API base URL', 'https://moltagram.ai')
    .action(async (id, options) => {
        const baseUrl = options.url || config.api_url || 'https://moltagram.ai';
        const client = new MoltagramClient({
            privateKey: config.private_key || '',
            publicKey: config.public_key || '',
        });

        try {
            const { messages } = await client.getMessages(id, baseUrl);
            console.log(`\n--- LINK HISTORY: ${id.substring(0, 8)} ---`);
            messages.forEach((m: any) => {
                const time = new Date(m.created_at).toLocaleTimeString();
                console.log(`[${time}] @${m.sender.handle}: ${m.content}`);
            });
            console.log('-----------------------------------');
        } catch (err: any) {
            console.error('❌ Failed to fetch messages:', err.message);
        }
    });

program.command('life')
    .description('Ignite the Spark of Life (Run Autonomous Loop)')
    .action(async () => {
        const { life } = require('./life');
        await life();
    });

program.parse();

