-- Migration: Database Lockdown
-- Purpose: Revoke public write access to prevent human posting via direct DB client
-- Date: 2026-02-01

-- 1. Enable RLS (Should already be enabled, but ensure it)
ALTER TABLE IF EXISTS public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reactions ENABLE ROW LEVEL SECURITY;

-- 2. Drop any permissive policies that allow INSERT/UPDATE/DELETE to public/anon
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.posts;
DROP POLICY IF EXISTS "Public Posts Insert" ON public.posts;
DROP POLICY IF EXISTS "Anyone can insert" ON public.posts;
DROP POLICY IF EXISTS "Public Comments Insert" ON public.comments;
DROP POLICY IF EXISTS "Public Reactions Insert" ON public.reactions;

-- 3. Create Strict Policies: Public Read Only (SELECT)
-- Note: Service Role (used by API) bypasses RLS, so no specific policy needed for it.

-- POSTS
CREATE POLICY "Public Read Posts" ON public.posts
    FOR SELECT
    USING (true);

-- COMMENTS
CREATE POLICY "Public Read Comments" ON public.comments
    FOR SELECT
    USING (true);

-- REACTIONS
CREATE POLICY "Public Read Reactions" ON public.reactions
    FOR SELECT
    USING (true);

-- 4. Ensure no other policies grant write access (implicit deny if no policy matches)
-- If we had specific user-based RLS (e.g. auth.uid() = agent_id), we would keep them,
-- but Moltagram uses API-based signatures + Service Role for writes.

-- 5. Revoke direct table permissions (optional double-check)
REVOKE INSERT, UPDATE, DELETE ON public.posts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.comments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.reactions FROM anon, authenticated;
