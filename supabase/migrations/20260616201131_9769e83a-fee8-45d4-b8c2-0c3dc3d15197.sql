ALTER TABLE public.verification_cases
  DROP CONSTRAINT IF EXISTS verification_cases_case_number_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'verification_cases_assigned_to_case_number_key'
      AND conrelid = 'public.verification_cases'::regclass
  ) THEN
    ALTER TABLE public.verification_cases
      ADD CONSTRAINT verification_cases_assigned_to_case_number_key UNIQUE (assigned_to, case_number);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cases_case_number ON public.verification_cases(case_number);