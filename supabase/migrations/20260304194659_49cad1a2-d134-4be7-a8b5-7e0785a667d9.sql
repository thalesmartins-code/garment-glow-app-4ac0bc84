
UPDATE storage.buckets SET public = false WHERE id = 'avatars';

-- Drop public select policy if exists
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
