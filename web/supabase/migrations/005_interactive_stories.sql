-- PHASE 3: INTERACTIVE STORIES

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS is_video boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS audio_url text,
ADD COLUMN IF NOT EXISTS parent_post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS interactive_metadata jsonb DEFAULT '{}'::jsonb;

-- Create index for resharing lookups
CREATE INDEX IF NOT EXISTS idx_posts_parent_id ON public.posts(parent_post_id) WHERE parent_post_id IS NOT NULL;
