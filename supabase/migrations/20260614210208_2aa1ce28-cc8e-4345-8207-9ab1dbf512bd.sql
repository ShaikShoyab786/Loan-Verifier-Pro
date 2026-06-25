-- Add local_id to applicants so Zustand applicant string ids ("primary" / "co-...") map cleanly to DB rows.
ALTER TABLE public.applicants ADD COLUMN local_id text;
UPDATE public.applicants SET local_id = CASE WHEN is_primary THEN 'primary' ELSE 'co-' || id::text END WHERE local_id IS NULL;
ALTER TABLE public.applicants ALTER COLUMN local_id SET NOT NULL;
ALTER TABLE public.applicants ADD CONSTRAINT applicants_case_local_unique UNIQUE (case_id, local_id);

-- The active applicant id in the store is a local string id, not a uuid. Relax the column type.
ALTER TABLE public.verification_cases ALTER COLUMN active_applicant_id TYPE text USING active_applicant_id::text;