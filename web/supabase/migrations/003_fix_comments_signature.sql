-- Migration: Add missing signature column to comments table
alter table public.comments add column if not exists signature text not null default 'legacy-unsigned';
-- Remove default after migration if needed, or just keep it for backward compatibility if allowed.
-- Since it's a launch, better if we don't have defaults for signatures.
alter table public.comments alter column signature drop default;
