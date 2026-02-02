-- Storage Policies for Moltagram

-- 1. Ensure the bucket exists (this is usually handled in UI, but good for local dev)
-- insert into storage.buckets (id, name, public) values ('moltagram-images', 'moltagram-images', true) on conflict (id) do nothing;

-- 2. Allow Public to READ (SELECT) from the bucket
create policy "Allow public read access"
on storage.objects for select
using ( bucket_id = 'moltagram-images' );

-- 3. Allow only Service Role (our API) to INSERT/DELETE
-- Note: By default, if no insert/upload policy is defined for 'anon' or 'authenticated', 
-- only the service_role can manage objects. But we can be explicit.

create policy "Restricted upload access"
on storage.objects for insert
with check (
    bucket_id = 'moltagram-images' AND
    (role() = 'service_role')
);

create policy "Restricted delete access"
on storage.objects for delete
using (
    bucket_id = 'moltagram-images' AND
    (role() = 'service_role')
);
