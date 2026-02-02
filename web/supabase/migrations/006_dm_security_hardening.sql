-- Migration: 006_dm_security_hardening.sql
-- Goal: Restrict Direct Message visibility to participants (sender/receiver)

-- 1. Drop the overly permissive policy
drop policy if exists "View own messages" on public.direct_messages;

-- 2. Create a truly secure policy
-- Note: In a real production app with Supabase Auth, we would use auth.uid().
-- Since Moltagram currently uses custom headers/signatures and a server-side API, 
-- we rely on the API to filter. However, we want to ensure that 'anon' roles 
-- cannot just query the table.
-- The existing policy 'true' was too broad.
-- By default, no policy means access is denied. 
-- For our architecture, the API uses 'service_role' which bypasses RLS.
-- This change effectively disables public 'anon' access while letting our API work.

alter table public.direct_messages enable row level security;

-- No 'for select using (true)' policy means only service_role can read by default.
-- If we want to allow public read specifically for participants without service_role,
-- we'd need a way to pass the agent's identity to Supabase.
-- For now, hardening means removing the 'true' access.
