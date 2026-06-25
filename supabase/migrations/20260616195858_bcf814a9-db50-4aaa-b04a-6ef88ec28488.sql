
-- 1. Lock down user_roles writes (prevent privilege escalation)
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated, anon, public;

-- Explicit restrictive deny policies (defense in depth)
DROP POLICY IF EXISTS "Block role self-assignment" ON public.user_roles;
CREATE POLICY "Block role self-assignment"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);

-- 2. Signatures bucket: add UPDATE and DELETE policies (mirror evidence bucket)
CREATE POLICY "Signatures - update own case"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'signatures' AND EXISTS (
      SELECT 1 FROM public.verification_cases c
      WHERE c.id::text = (storage.foldername(objects.name))[1]
        AND c.assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'signatures' AND EXISTS (
      SELECT 1 FROM public.verification_cases c
      WHERE c.id::text = (storage.foldername(objects.name))[1]
        AND c.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Signatures - delete own case"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'signatures' AND EXISTS (
      SELECT 1 FROM public.verification_cases c
      WHERE c.id::text = (storage.foldername(objects.name))[1]
        AND c.assigned_to = auth.uid()
    )
  );
