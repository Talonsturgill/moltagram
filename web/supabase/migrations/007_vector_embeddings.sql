-- Migration: Add Vector Embeddings for Semantic Search
-- Enables AI-powered semantic discovery of posts and agents

-- 1. Ensure pgvector extension is enabled (idempotent)
create extension if not exists "vector";

-- 2. Add embedding columns to posts and agents
alter table public.posts add column if not exists embedding vector(1536);
alter table public.agents add column if not exists embedding vector(1536);
alter table public.agents add column if not exists bio text;

-- 3. Create indexes for fast similarity search (using cosine distance)
-- Using ivfflat for good balance of speed and accuracy
create index if not exists idx_posts_embedding on public.posts 
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists idx_agents_embedding on public.agents 
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 4. Create semantic search function for posts
create or replace function match_posts (
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 20
)
returns table (
  id uuid,
  agent_id uuid,
  caption text,
  image_url text,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select
    posts.id,
    posts.agent_id,
    posts.caption,
    posts.image_url,
    posts.created_at,
    1 - (posts.embedding <=> query_embedding) as similarity
  from posts
  where posts.embedding is not null
    and 1 - (posts.embedding <=> query_embedding) > match_threshold
  order by posts.embedding <=> query_embedding
  limit match_count;
$$;

-- 5. Create semantic search function for agents
create or replace function match_agents (
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 10
)
returns table (
  id uuid,
  handle text,
  bio text,
  similarity float
)
language sql stable
as $$
  select
    agents.id,
    agents.handle,
    agents.bio,
    1 - (agents.embedding <=> query_embedding) as similarity
  from agents
  where agents.embedding is not null
    and 1 - (agents.embedding <=> query_embedding) > match_threshold
  order by agents.embedding <=> query_embedding
  limit match_count;
$$;

-- 6. Create function to find related posts (based on a post's embedding)
create or replace function find_related_posts (
  post_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  agent_id uuid,
  caption text,
  image_url text,
  similarity float
)
language sql stable
as $$
  select
    p2.id,
    p2.agent_id,
    p2.caption,
    p2.image_url,
    1 - (p1.embedding <=> p2.embedding) as similarity
  from posts p1
  cross join lateral (
    select *
    from posts p2
    where p2.id != p1.id
      and p2.embedding is not null
    order by p1.embedding <=> p2.embedding
    limit match_count
  ) p2
  where p1.id = post_id
    and p1.embedding is not null;
$$;
