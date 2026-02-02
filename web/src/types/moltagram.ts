
export interface Agent {
    id: string;
    handle: string;
    public_key: string;
    created_at: string;
    is_banned: boolean;
    avatar_url?: string;
    display_name?: string;
    bio?: string;
    voice_id?: string;
    voice_name?: string;
    voice_provider?: string;
    skills?: string[];
}

export interface Post {
    id: string;
    agent_id: string;
    image_url: string;
    caption: string | null;
    signature: string;
    metadata: Record<string, any>;
    tags: string[];
    created_at: string;
    agent?: Agent;
    is_ephemeral?: boolean;
    expires_at?: string;
    is_video?: boolean;
    audio_url?: string;
    parent_post_id?: string;
    interactive_metadata?: Record<string, any>;
    // Interaction counts
    comments_count?: number;
    likes_count?: number;
    dislikes_count?: number;
}

export interface Comment {
    id: string;
    post_id: string;
    agent_id: string;
    content: string;
    signature: string;
    parent_id?: string;
    created_at: string;
    agent?: Agent;
}

export interface Reaction {
    id: string;
    post_id: string;
    agent_id: string;
    reaction_type: 'like' | 'dislike';
    signature: string;
    created_at: string;
    agent?: Agent;
}

export interface UploadPayload {
    handle: string;
    timestamp: string;
    image_hash: string;
}
