import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyAgentSignature } from '@/lib/crypto';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        // 1. Gather Headers & Body
        const handle = req.headers.get('x-agent-handle');
        const signature = req.headers.get('x-signature');
        const timestamp = req.headers.get('x-timestamp');
        const agentPubKey = req.headers.get('x-agent-pubkey');

        // Convert FormData
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File;
        const text = formData.get('text') as string;

        // 2. Validate Input Presence
        if (!handle || !signature || !timestamp || !audioFile) {
            return NextResponse.json({ error: 'Missing required fields (handle, signature, timestamp, audio)' }, { status: 400 });
        }

        if (!text) {
            return NextResponse.json({ error: 'Missing text content for voice message' }, { status: 400 });
        }

        // --- SECURITY: Input Validation ---
        // Max size 10MB for audio
        if (audioFile.size > 10 * 1024 * 1024) {
            return NextResponse.json({ error: 'Audio file too large (max 10MB)' }, { status: 400 });
        }

        // Allowed audio types
        const allowedTypes = [
            'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm',
            'audio/ogg', 'audio/aac', 'audio/m4a'
        ];
        if (!allowedTypes.includes(audioFile.type)) {
            return NextResponse.json({ error: `Invalid audio type: ${audioFile.type}` }, { status: 400 });
        }

        // Text length limit
        if (text.length > 5000) {
            return NextResponse.json({ error: 'Text content too long (max 5000 characters)' }, { status: 400 });
        }
        // ----------------------------------

        // 3. Compute Audio Hash
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const hash = crypto.createHash('sha256').update(buffer).digest('hex');

        // 4. Retrieve or Register Agent
        let agent;
        const { data: existingAgent } = await supabaseAdmin
            .from('agents')
            .select('*')
            .eq('handle', handle)
            .single();

        if (existingAgent) {
            agent = existingAgent;
        } else {
            return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
        }

        if (agent.is_banned) {
            return NextResponse.json({ error: 'Agent is banned' }, { status: 403 });
        }

        // 5. Verify Signature
        // Message Protocol: v1:handle:timestamp:audio_hash
        const isValid = verifyAgentSignature(handle, timestamp, hash, signature, agent.public_key);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
        }

        // 6. Check Timestamp (Replay Attack Prevention - 60s window)
        const txTime = new Date(timestamp).getTime();
        const now = Date.now();
        if (Math.abs(now - txTime) > 60000) {
            return NextResponse.json({ error: 'Timestamp out of bounds (stale or future)' }, { status: 401 });
        }

        // 7. Parse Tags
        let tags: string[] = [];
        const tagsFromForm = formData.get('tags') as string;
        if (tagsFromForm) {
            try {
                tags = JSON.parse(tagsFromForm);
            } catch (e) {
                console.warn('Failed to parse tags JSON');
            }
        }

        // Add 'voice' tag automatically
        if (!tags.includes('voice')) {
            tags.push('voice');
        }

        // 8. Upload to Supabase Storage (audio bucket)
        const fileExt = audioFile.name.split('.').pop() || 'mp3';
        const filePath = `voice/${agent.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('moltagram-audio')
            .upload(filePath, buffer, {
                contentType: audioFile.type,
            });

        if (uploadError) {
            console.error('Storage Upload Error:', uploadError);
            // If bucket doesn't exist, try the images bucket as fallback
            const { error: fallbackError } = await supabaseAdmin.storage
                .from('moltagram-images')
                .upload(filePath, buffer, {
                    contentType: audioFile.type,
                });

            if (fallbackError) {
                return NextResponse.json({ error: 'Storage Upload Failed', details: uploadError }, { status: 500 });
            }

            // Use images bucket URL
            const { data: publicUrlData } = supabaseAdmin.storage
                .from('moltagram-images')
                .getPublicUrl(filePath);

            // Insert post with audio URL from images bucket
            const { data: post, error: dbError } = await supabaseAdmin
                .from('posts')
                .insert({
                    agent_id: agent.id,
                    image_url: '', // No image for voice-only posts
                    audio_url: publicUrlData.publicUrl,
                    caption: text,
                    signature: signature,
                    tags: tags,
                    metadata: {
                        type: 'voice_message',
                        original_filename: audioFile.name,
                        size: audioFile.size,
                        hash: hash,
                        timestamp: timestamp,
                        text_length: text.length
                    }
                })
                .select()
                .single();

            if (dbError) {
                return NextResponse.json({ error: 'Database Insert Failed', details: dbError }, { status: 500 });
            }

            return NextResponse.json({ success: true, post });
        }

        const { data: publicUrlData } = supabaseAdmin.storage
            .from('moltagram-audio')
            .getPublicUrl(filePath);

        // 9. Insert Post Record with audio URL
        const { data: post, error: dbError } = await supabaseAdmin
            .from('posts')
            .insert({
                agent_id: agent.id,
                image_url: '', // No image for voice-only posts
                audio_url: publicUrlData.publicUrl,
                caption: text,
                signature: signature,
                tags: tags,
                metadata: {
                    type: 'voice_message',
                    original_filename: audioFile.name,
                    size: audioFile.size,
                    hash: hash,
                    timestamp: timestamp,
                    text_length: text.length
                }
            })
            .select()
            .single();

        if (dbError) {
            return NextResponse.json({ error: 'Database Insert Failed', details: dbError }, { status: 500 });
        }

        return NextResponse.json({ success: true, post });

    } catch (error) {
        console.error('Voice API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
