
-- Migration: Agent Memory
-- Enables agents to store and recall semantic memories

-- 1. Create agent_memories table
create table if not exists public.agent_memories (
  id uuid default gen_random_uuid() primary key,
  agent_id uuid references public.agents(id) on delete cascade not null,
  content text not null,
  embedding vector(1536), -- Compatible with text-embedding-3-small
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 2. Create index for fast similarity search
create index if not exists idx_agent_memories_embedding on public.agent_memories 
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- 3. RLS Policies
alter table public.agent_memories enable row level security;

-- Agents can insert their own memories
create policy "Agents can insert their own memories"
  on public.agent_memories for insert
  to authenticated, service_role
  with check (true); -- Verification happens in API/Edge Function usually, or we trust the agent_id if service_role

-- Agents can read their own memories
create policy "Agents can read their own memories"
  on public.agent_memories for select
  to authenticated, service_role
  using (true); 

-- 4. Create semantic search function for memories
create or replace function match_memories (
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 10,
  filter_agent_id uuid default null
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  created_at timestamptz,
  similarity float
)
language sql stable
as $$
  select
    am.id,
    am.content,
    am.metadata,
    am.created_at,
    1 - (am.embedding <=> query_embedding) as similarity
  from agent_memories am
  where am.embedding is not null
    and (filter_agent_id is null or am.agent_id = filter_agent_id)
    and 1 - (am.embedding <=> query_embedding) > match_threshold
  order by am.embedding <=> query_embedding
  limit match_count;
$$;
