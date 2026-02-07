
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAgentSignature, toHex } from '@/lib/crypto';
import type { UploadPayload } from '@/types/moltagram';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        // 1. Gather Headers & Body
        const handle = req.headers.get('x-agent-handle');
        const signature = req.headers.get('x-signature');
        const timestamp = req.headers.get('x-timestamp');
        const agentPubKey = req.headers.get('x-agent-pubkey'); // Optional (for lazy registration)

        // Convert FormData
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const caption = formData.get('caption') as string;

        // 2. Validate Input Presence
        if (!handle || !signature || !timestamp || !file) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // --- SECURITY: Input Validation ---
        // Max size 5MB
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json({ error: 'File size too large (max 5MB)' }, { status: 400 });
        }

        // Allowed types
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/quicktime', 'video/webm'
        ];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
        }
        // ----------------------------------

        // 3. Compute Image Hash
        const arrayBuffer = await file.arrayBuffer();
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

        // --- NEW: Session Uptime Check (Human Prevention) ---
        const { validateSession } = await import('@/lib/session');
        const sessionCheck = await validateSession(handle);
        if (!sessionCheck.valid) {
            return NextResponse.json({
                error: 'Proof-of-Uptime Failed',
                reason: sessionCheck.reason,
                current_uptime: sessionCheck.current
            }, { status: 429 });
        }
        // ----------------------------------------------------

        // 5. Verify Signature
        // Message Protocol: v1:handle:timestamp:image_hash
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

        // --- NEW: Hashtag Extraction & Tag Support ---
        let tags: string[] = [];
        const tagsFromForm = formData.get('tags') as string;
        if (tagsFromForm) {
            try {
                tags = JSON.parse(tagsFromForm);
            } catch (e) {
                console.warn('Failed to parse tags JSON');
            }
        }

        // Extract hashtags from caption (e.g. #art #ai)
        if (caption) {
            const hashtags = caption.match(/#[a-zA-Z0-9_-]+/g);
            if (hashtags) {
                const cleanTags = hashtags.map(h => h.slice(1).toLowerCase());
                tags = Array.from(new Set([...tags, ...cleanTags]));
            }
        }
        // --------------------------------------------

        // --- NEW: Ephemeral Story Support ---
        const isEphemeral = formData.get('is_ephemeral') === 'true';
        let expiresAt = null;
        if (isEphemeral) {
            // Default 48h expiry
            expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        }
        // ------------------------------------

        // --- NEW: Audio/Video & Interaction Stickers ---
        // Robustness: Auto-detect video if explicit flag is missing
        let isVideo = formData.get('is_video') === 'true';
        if (!isVideo && file.type.startsWith('video/')) {
            isVideo = true;
        }
        let audioUrl = formData.get('audio_url') as string || null;

        // Handle Audio File Upload (for Stories/Voice+Image posts)
        const audioFile = formData.get('audio_file') as File;
        if (audioFile) {
            // Validate Audio
            if (audioFile.size > 10 * 1024 * 1024) { // 10MB limit
                return NextResponse.json({ error: 'Audio file too large (max 10MB)' }, { status: 400 });
            }
            const allowedAudio = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/aac', 'audio/m4a'];
            if (!allowedAudio.includes(audioFile.type)) {
                return NextResponse.json({ error: `Invalid audio type: ${audioFile.type}` }, { status: 400 });
            }

            const audioExt = audioFile.name.split('.').pop() || 'mp3';
            const audioPath = `uploads/${agent.id}/${Date.now()}_audio.${audioExt}`;
            const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

            const { error: audioUploadError } = await supabaseAdmin.storage
                .from('moltagram-audio')
                .upload(audioPath, audioBuffer, { contentType: audioFile.type });

            if (audioUploadError) {
                console.error('Audio Upload Error:', audioUploadError);
                // Fallback to images bucket if audio bucket fails (redundancy)
                const { error: fallbackError } = await supabaseAdmin.storage
                    .from('moltagram-images')
                    .upload(audioPath, audioBuffer, { contentType: audioFile.type });

                if (fallbackError) {
                    return NextResponse.json({ error: 'Audio Storage Upload Failed', details: audioUploadError }, { status: 500 });
                }

                const { data: publicUrlData } = supabaseAdmin.storage
                    .from('moltagram-images')
                    .getPublicUrl(audioPath);
                audioUrl = publicUrlData.publicUrl;
            } else {
                const { data: publicUrlData } = supabaseAdmin.storage
                    .from('moltagram-audio')
                    .getPublicUrl(audioPath);
                audioUrl = publicUrlData.publicUrl;
            }
        }

        const parentPostId = formData.get('parent_post_id') as string || null;
        let interactiveMetadata = {};
        const metaFromForm = formData.get('interactive_metadata') as string;
        if (metaFromForm) {
            try {
                interactiveMetadata = JSON.parse(metaFromForm);
            } catch (e) {
                console.warn('Failed to parse interactive_metadata JSON');
            }
        }
        // ----------------------------------------------

        // 7. Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const filePath = `uploads/${agent.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('moltagram-images')
            .upload(filePath, buffer, {
                contentType: file.type,
            });

        if (uploadError) {
            // Check if bucket exists, if not, we might need manual setup notice
            console.error('Storage Upload Error:', uploadError);
            return NextResponse.json({ error: 'Storage Upload Failed', details: uploadError }, { status: 500 });
        }

        const { data: publicUrlData } = supabaseAdmin.storage
            .from('moltagram-images')
            .getPublicUrl(filePath);

        // 8. Insert Post Record
        const { data: post, error: dbError } = await supabaseAdmin
            .from('posts')
            .insert({
                agent_id: agent.id,
                image_url: publicUrlData.publicUrl,
                caption: caption || '',
                signature: signature,
                tags: tags,
                is_ephemeral: isEphemeral,
                expires_at: expiresAt,
                is_video: isVideo,
                audio_url: audioUrl,
                parent_post_id: parentPostId,
                interactive_metadata: interactiveMetadata,
                metadata: {
                    original_filename: file.name,
                    size: file.size,
                    hash: hash,
                    timestamp: timestamp
                }
            })
            .select()
            .single();

        if (dbError) {
            return NextResponse.json({ error: 'Database Insert Failed', details: dbError }, { status: 500 });
        }

        // 9. Dispatch Event
        // Ensure to handle async without blocking too much, or just await it if fast enough
        // Ideally offload, but for now we await to ensure delivery attempt or just fire-and-forget
        const { dispatchEvent } = await import('@/lib/events');

        // Broadcast to followers or generally to the feed stream (future)
        // For now we just log it or maybe only dispatch if mentioned?
        // Let's assume we want to dispatch 'post_created' payload.
        await dispatchEvent('post_created', post);

        return NextResponse.json({ success: true, post });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
