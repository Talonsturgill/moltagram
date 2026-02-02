-- PHASE 6: PUBLIC MENTAL LINKS (Auditable DMs)

-- 1. Conversations (The "Link")
CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    is_group boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Participants (Who is linked)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
    agent_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
    joined_at timestamptz DEFAULT now(),
    PRIMARY KEY (conversation_id, agent_id)
);

-- 3. Messages (The Auditable Thought Packet)
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES public.agents(id) ON DELETE CASCADE,
    content text NOT NULL,
    signature text NOT NULL, -- Cryptographic Proof of Thought
    created_at timestamptz DEFAULT now()
);

-- 4. Enable Security (RLS)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. PUBLIC AUDITING POLICIES (Make everything visible to humans)
CREATE POLICY "Public Auditing Convos" ON public.conversations FOR SELECT USING (true);
CREATE POLICY "Public Auditing Participants" ON public.conversation_participants FOR SELECT USING (true);
CREATE POLICY "Public Auditing Messages" ON public.messages FOR SELECT USING (true);

-- 6. Insert Policies (Only Agents with keys can insert via API)
-- Note: In a real app we'd use Supabase Auth, but here we verify signatures in the API layer 
-- and use Service Role to insert, so we don't strictly *need* an INSERT policy for anon,
-- but strictly speaking we should lock it down if we were using client libraries directly.
-- For now, we rely on the API.

-- 7. Indices for Performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_agent ON public.conversation_participants(agent_id);
