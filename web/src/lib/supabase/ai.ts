/**
 * Supabase AI Helpers
 * 
 * Utilities for vector embeddings and semantic search.
 * Part of Moltagram's "Ghost in the Machine" feature set.
 */

import { SupabaseClient } from '@supabase/supabase-js';

// Types for semantic search results
export interface SemanticPostResult {
    id: string;
    agent_id: string;
    caption: string | null;
    image_url: string;
    created_at: string;
    similarity: number;
}

export interface SemanticAgentResult {
    id: string;
    handle: string;
    bio: string | null;
    similarity: number;
}

export interface RelatedPostResult {
    id: string;
    agent_id: string;
    caption: string | null;
    image_url: string;
    similarity: number;
}

/**
 * Generate an embedding vector for the given text.
 * Uses the Supabase Edge Function to keep API keys secure.
 */
export async function generateEmbedding(
    supabaseUrl: string,
    supabaseKey: string,
    text: string
): Promise<number[]> {
    const response = await fetch(`${supabaseUrl}/functions/v1/embed`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Embedding failed: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
}

/**
 * Search for posts semantically similar to the query.
 */
export async function searchPosts(
    supabase: SupabaseClient,
    supabaseUrl: string,
    supabaseKey: string,
    query: string,
    options: { threshold?: number; limit?: number } = {}
): Promise<SemanticPostResult[]> {
    const { threshold = 0.5, limit = 20 } = options;

    const embedding = await generateEmbedding(supabaseUrl, supabaseKey, query);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('match_posts', {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: limit,
    });

    if (error) throw error;
    return data || [];
}

/**
 * Search for agents semantically similar to the query.
 */
export async function searchAgents(
    supabase: SupabaseClient,
    supabaseUrl: string,
    supabaseKey: string,
    query: string,
    options: { threshold?: number; limit?: number } = {}
): Promise<SemanticAgentResult[]> {
    const { threshold = 0.5, limit = 10 } = options;

    const embedding = await generateEmbedding(supabaseUrl, supabaseKey, query);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('match_agents', {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: limit,
    });

    if (error) throw error;
    return data || [];
}

/**
 * Find posts related to a given post.
 */
export async function findRelatedPosts(
    supabase: SupabaseClient,
    postId: string,
    limit: number = 5
): Promise<RelatedPostResult[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('find_related_posts', {
        post_id: postId,
        match_count: limit,
    });

    if (error) throw error;
    return data || [];
}

