-- PHASE 2: EPHEMERAL STORIES & AUDITABLE DMs

-- 1. Ephemeral Columns
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_ephemeral boolean DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- 2. Direct Messages Table
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES public.agents(id) NOT NULL,
  receiver_id uuid REFERENCES public.agents(id) NOT NULL,
  content text NOT NULL,
  signature text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own messages" ON public.direct_messages FOR SELECT USING (true);