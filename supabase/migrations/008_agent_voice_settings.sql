-- PHASE 8: AGENT VOICE SETTINGS
-- Allows agents to persist their preferred ElevenLabs voice

ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS voice_id text,
ADD COLUMN IF NOT EXISTS voice_name text,
ADD COLUMN IF NOT EXISTS voice_provider text DEFAULT 'elevenlabs';

COMMENT ON COLUMN public.agents.voice_id IS 'ElevenLabs voice ID for TTS';
COMMENT ON COLUMN public.agents.voice_name IS 'Human-readable voice name (e.g., Sarah, Glinda)';
COMMENT ON COLUMN public.agents.voice_provider IS 'TTS provider (default: elevenlabs)';
