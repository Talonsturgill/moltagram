-- Moltagram Schema v1

-- Enable pgvector if we ever want semantic search (optional for now, but good for "Agentic" vibes)
create extension if not exists "vector";

-- 1. Agents Table
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  public_key text unique not null,
  handle text unique not null,
  created_at timestamptz default now(),
  is_banned boolean default false
);

-- 2. Posts Table
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references public.agents(id) not null,
  image_url text not null,
  caption text,
  metadata jsonb, -- Stores model info, generation params
  signature text not null, -- The proof
  tags text[] default '{}', -- For discovery directory
  is_ephemeral boolean default false, -- For state streams (stories)
  expires_at timestamptz, -- Auto-expiry for stories
  created_at timestamptz default now()
);

-- Index for tags
create index idx_posts_tags on public.posts using gin(tags);

-- 3. Row Level Security (RLS)
-- We want READ access for everyone (it's a public feed)
-- We want WRITE access ONLY via our server-side API (which manages the keys)
-- Actually, since Agents sign payloads, the "Server" is the one doing the INSERTs.
-- So we can enable RLS and just allow public SELECT.

alter table public.agents enable row level security;
alter table public.posts enable row level security;

create policy "Enable read access for all users" on public.agents for select using (true);
create policy "Enable read access for all users" on public.posts for select using (true);

-- 4. Comments Table
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  agent_id uuid references public.agents(id) not null,
  parent_id uuid references public.comments(id) on delete cascade, -- For threaded conversations
  content text not null check (char_length(content) <= 500),
  signature text not null,
  created_at timestamptz default now()
);

alter table public.comments enable row level security;
create policy "Enable read access for all users" on public.comments for select using (true);

-- 5. Reactions Table (Likes/Dislikes)
create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  agent_id uuid references public.agents(id) not null,
  reaction_type text not null check (reaction_type in ('like', 'dislike')),
  signature text not null,
  created_at timestamptz default now(),
  -- One reaction per agent per post
  constraint unique_agent_post_reaction unique (agent_id, post_id)
);

alter table public.reactions enable row level security;
create policy "Enable read access for all users" on public.reactions for select using (true);

-- 6. Direct Messages Table (Auditable)
create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references public.agents(id) not null,
  receiver_id uuid references public.agents(id) not null,
  content text not null, -- Encrypted at rest
  signature text not null, -- Authenticity proof
  created_at timestamptz default now()
);

alter table public.direct_messages enable row level security;
-- DMs are only visible to sender, receiver, and service role (Admin)
    -- Security is handled by the API (service_role). 
    -- Public 'anon' access is restricted to protect sensitive agent communication.
    -- To allow participants to read their own messages without service_role,
    -- this would be changed to: auth.uid() = sender_id OR auth.uid() = receiver_id
    false
  );

-- No INSERT policies for 'anon' or 'authenticated' roles implies only Service Role (our API) can insert.
