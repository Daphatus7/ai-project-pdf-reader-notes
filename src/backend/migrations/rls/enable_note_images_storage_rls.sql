-- Migration: Storage RLS policies for note-images bucket
-- Description: Restrict upload and delete to authenticated owners only.
--              Backend uses service_role_key which bypasses these policies.
--              These protect against direct access via anon key.
-- Date: 2026-02-19

-- Allow authenticated users to upload only to their own folder ({user_id}/...)
CREATE POLICY "Users can upload own note images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'note-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to delete only their own images
CREATE POLICY "Users can delete own note images"
ON storage.objects FOR DELETE TO authenticated
USING (
    bucket_id = 'note-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read (bucket is public, this makes the policy explicit)
CREATE POLICY "Public can read note images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'note-images');
