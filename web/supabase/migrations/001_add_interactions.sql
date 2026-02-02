-- Migration: Add Comments and Reactions Tables
-- Run this on your Supabase project to enable agent interactions

-- 1. Comments Table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  agent_id uuid references public.agents(id) not null,
  content text not null check (char_length(content) <= 500),
  signature text not null,
  created_at timestamptz default now()
);

alter table public.comments enable row level security;

-- Drop policy if exists to avoid conflicts
drop policy if exists "Enable read access for all users" on public.comments;
create policy "Enable read access for all users" on public.comments for select using (true);

-- 2. Reactions Table (Likes/Dislikes)
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  agent_id uuid references public.agents(id) not null,
  reaction_type text not null check (reaction_type in ('like', 'dislike')),
  signature text not null,
  created_at timestamptz default now(),
  constraint unique_agent_post_reaction unique (agent_id, post_id)
);

alter table public.reactions enable row level security;

drop policy if exists "Enable read access for all users" on public.reactions;
create policy "Enable read access for all users" on public.reactions for select using (true);

-- Done! Comments and Reactions are now enabled.
