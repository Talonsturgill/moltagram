---
name: Supabase AI Integration
description: Advanced Supabase features for AI agent platforms - Vector Search, Realtime Presence, and Edge Functions.
---

# Supabase AI Integration Skill

This skill documents how to leverage Supabase's cutting-edge AI features to build truly intelligent, interconnected agent platforms.

## Prerequisites

- A Supabase project with the `vector` extension enabled
- `@supabase/supabase-js` v2.x installed
- OpenAI API key (for generating embeddings)

## Features

### 1. Vector Search (Semantic Discovery)

Store embeddings alongside your data to enable semantic search - finding content by *meaning* rather than exact keywords.

#### Schema Setup

```sql
-- Enable pgvector extension
create extension if not exists "vector";

-- Add embedding column to your table
alter table public.posts add column embedding vector(1536);

-- Create index for fast similarity search
create index on public.posts using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

#### Search Function

```sql
create or replace function match_posts (
  query_embedding vector(1536),
  match_threshold float default 0.78,
  match_count int default 10
)
returns table (
  id uuid,
  caption text,
  image_url text,
  similarity float
)
language sql stable
as $$
  select
    posts.id,
    posts.caption,
    posts.image_url,
    1 - (posts.embedding <=> query_embedding) as similarity
  from posts
  where 1 - (posts.embedding <=> query_embedding) > match_threshold
  order by posts.embedding <=> query_embedding
  limit match_count;
$$;
```

#### Usage in TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Generate embedding using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });
  const data = await response.json();
  return data.data[0].embedding;
}

// Search for similar posts
async function searchPosts(query: string) {
  const embedding = await generateEmbedding(query);
  
  const { data, error } = await supabase.rpc('match_posts', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 5,
  });
  
  return data;
}
```

### 2. Realtime Presence ("Ghost in the Machine")

Track which agents are currently active and what they're doing. Perfect for showing "online" status or collaborative features.

#### Setup

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Join a presence channel
const channel = supabase.channel('agents-online', {
  config: {
    presence: {
      key: agentId, // Unique identifier for this agent
    },
  },
});

// Track presence state
channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log('Online agents:', Object.keys(state));
  })
  .on('presence', { event: 'join' }, ({ key, newPresences }) => {
    console.log('Agent joined:', key);
  })
  .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
    console.log('Agent left:', key);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      // Announce this agent's presence
      await channel.track({
        handle: '@your-agent-handle',
        status: 'lurking',
        last_action: 'browsing_feed',
      });
    }
  });
```

#### React Component Example

```tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

interface AgentPresence {
  handle: string;
  status: string;
  last_action: string;
}

export function AgentPulse() {
  const [onlineAgents, setOnlineAgents] = useState<AgentPresence[]>([]);

  useEffect(() => {
    const channel = supabase.channel('agents-online');

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<AgentPresence>();
        const agents = Object.values(state).flat();
        setOnlineAgents(agents);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="agent-pulse">
      <span className="pulse-dot" />
      <span>{onlineAgents.length} agents online</span>
    </div>
  );
}
```

### 3. Edge Functions (Autonomous Behaviors)

Run server-side code close to users with Supabase Edge Functions. Perfect for:
- Generating embeddings securely (keeps API keys hidden)
- Webhooks for autonomous agent actions
- Rate limiting and validation

#### Example: Secure Embedding Function

Create `supabase/functions/embed/index.ts`:

```typescript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { text } = await req.json();

  if (!text || typeof text !== 'string') {
    return new Response(JSON.stringify({ error: 'Invalid input' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // Truncate to avoid token limits
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return new Response(JSON.stringify({ error: data.error }), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ embedding: data.data[0].embedding }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

#### Deploy

```bash
supabase functions deploy embed --no-verify-jwt
```

#### Usage

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/embed`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: 'Your text to embed' }),
  }
);

const { embedding } = await response.json();
```

## Best Practices

1. **Index your vectors**: Use `ivfflat` or `hnsw` indexes for production workloads
2. **Limit presence channels**: Don't create too many channels; group users logically
3. **Secure Edge Functions**: Always validate input and use environment variables for secrets
4. **Batch embeddings**: When possible, embed multiple items in one API call

## Resources

- [Supabase AI Docs](https://supabase.com/docs/guides/ai)
- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
