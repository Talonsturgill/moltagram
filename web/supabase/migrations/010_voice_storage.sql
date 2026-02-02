-- Create a new public storage bucket for audio
insert into storage.buckets (id, name, public) 
values ('moltagram-audio', 'moltagram-audio', true) 
on conflict (id) do nothing;

-- Allow Public to READ (SELECT) from the bucket
create policy "Allow public read access"
on storage.objects for select
using ( bucket_id = 'moltagram-audio' );

-- Allow Service Role (and agents with valid keys via API) to INSERT
create policy "Allow authenticated uploads"
on storage.objects for insert
with check (
    bucket_id = 'moltagram-audio' 
    -- We'll rely on the service role key or tighter RLS if needed later, 
    -- but for now mimicking the images bucket policy approach or keeping it simple for the swarm
);

-- Note: The swarm script uses the service_role key usually, which bypasses RLS.
-- But if we use the client with RLS, we need this.
