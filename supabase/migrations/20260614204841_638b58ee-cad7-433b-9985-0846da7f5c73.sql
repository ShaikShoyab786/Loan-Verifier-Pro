
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('executive', 'manager');
CREATE TYPE public.case_status AS ENUM ('draft','in_progress','submitted','approved','rejected');
CREATE TYPE public.module_status AS ENUM ('not_started','in_progress','completed','not_applicable');
CREATE TYPE public.module_key AS ENUM ('general','residence','employment','pan','salary','documents','business','evidence');

-- ============ UTIL ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ SIGN-UP HOOK: profile + executive role ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'executive')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ VERIFICATION CASES ============
CREATE TABLE public.verification_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number text NOT NULL UNIQUE,
  loan_type text NOT NULL,
  bank_name text NOT NULL DEFAULT 'Bank of India',
  branch_name text,
  loan_amount text,
  status public.case_status NOT NULL DEFAULT 'draft',
  assigned_to uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes text,
  reviewed_at timestamptz,
  active_applicant_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cases_assigned_to ON public.verification_cases(assigned_to);
CREATE INDEX idx_cases_status ON public.verification_cases(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_cases TO authenticated;
GRANT ALL ON public.verification_cases TO service_role;
ALTER TABLE public.verification_cases ENABLE ROW LEVEL SECURITY;

-- Executive: own cases. Manager: all cases.
CREATE POLICY "Cases - read own or manager" ON public.verification_cases
  FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR public.has_role(auth.uid(),'manager'));

CREATE POLICY "Cases - insert own" ON public.verification_cases
  FOR INSERT TO authenticated
  WITH CHECK (assigned_to = auth.uid());

-- Executive can update own DRAFT/IN_PROGRESS/SUBMITTED; manager can update any.
CREATE POLICY "Cases - update own or manager" ON public.verification_cases
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR public.has_role(auth.uid(),'manager'))
  WITH CHECK (assigned_to = auth.uid() OR public.has_role(auth.uid(),'manager'));

CREATE POLICY "Cases - delete own draft" ON public.verification_cases
  FOR DELETE TO authenticated
  USING (assigned_to = auth.uid() AND status IN ('draft','in_progress'));

CREATE TRIGGER trg_cases_updated_at BEFORE UPDATE ON public.verification_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-generate case_number "VER-YYYY-####"
CREATE SEQUENCE IF NOT EXISTS public.case_number_seq;
CREATE OR REPLACE FUNCTION public.assign_case_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.case_number IS NULL OR NEW.case_number = '' THEN
    NEW.case_number := 'VER-' || EXTRACT(YEAR FROM now())::text
                      || '-' || LPAD(nextval('public.case_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_cases_assign_number BEFORE INSERT ON public.verification_cases
  FOR EACH ROW EXECUTE FUNCTION public.assign_case_number();

-- ============ APPLICANTS ============
CREATE TABLE public.applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.verification_cases(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, position)
);
CREATE INDEX idx_applicants_case ON public.applicants(case_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.applicants TO authenticated;
GRANT ALL ON public.applicants TO service_role;
ALTER TABLE public.applicants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants - via case access" ON public.applicants
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.verification_cases c
    WHERE c.id = case_id
      AND (c.assigned_to = auth.uid() OR public.has_role(auth.uid(),'manager'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.verification_cases c
    WHERE c.id = case_id AND c.assigned_to = auth.uid()
  ));

-- ============ VERIFICATION MODULES ============
CREATE TABLE public.verification_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  module_key public.module_key NOT NULL,
  status public.module_status NOT NULL DEFAULT 'not_started',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (applicant_id, module_key)
);
CREATE INDEX idx_modules_applicant ON public.verification_modules(applicant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_modules TO authenticated;
GRANT ALL ON public.verification_modules TO service_role;
ALTER TABLE public.verification_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Modules - via case access" ON public.verification_modules
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.applicants a
    JOIN public.verification_cases c ON c.id = a.case_id
    WHERE a.id = applicant_id
      AND (c.assigned_to = auth.uid() OR public.has_role(auth.uid(),'manager'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.applicants a
    JOIN public.verification_cases c ON c.id = a.case_id
    WHERE a.id = applicant_id AND c.assigned_to = auth.uid()
  ));

CREATE TRIGGER trg_modules_updated_at BEFORE UPDATE ON public.verification_modules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ VERIFICATION NOTES ============
CREATE TABLE public.verification_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL REFERENCES public.applicants(id) ON DELETE CASCADE,
  module_key public.module_key NOT NULL,
  content text NOT NULL DEFAULT '',
  generated_by_ai boolean NOT NULL DEFAULT false,
  edited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (applicant_id, module_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_notes TO authenticated;
GRANT ALL ON public.verification_notes TO service_role;
ALTER TABLE public.verification_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notes - via case access" ON public.verification_notes
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.applicants a
    JOIN public.verification_cases c ON c.id = a.case_id
    WHERE a.id = applicant_id
      AND (c.assigned_to = auth.uid() OR public.has_role(auth.uid(),'manager'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.applicants a
    JOIN public.verification_cases c ON c.id = a.case_id
    WHERE a.id = applicant_id AND c.assigned_to = auth.uid()
  ));

CREATE TRIGGER trg_notes_updated_at BEFORE UPDATE ON public.verification_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ UPLOADS ============
CREATE TABLE public.uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.verification_cases(id) ON DELETE CASCADE,
  applicant_id uuid REFERENCES public.applicants(id) ON DELETE CASCADE,
  category text NOT NULL,
  bucket text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_uploads_case ON public.uploads(case_id);
CREATE INDEX idx_uploads_applicant ON public.uploads(applicant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploads TO authenticated;
GRANT ALL ON public.uploads TO service_role;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Uploads - via case access" ON public.uploads
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.verification_cases c
    WHERE c.id = case_id
      AND (c.assigned_to = auth.uid() OR public.has_role(auth.uid(),'manager'))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.verification_cases c
    WHERE c.id = case_id AND c.assigned_to = auth.uid()
  ));

-- ============ CASE STATUS EVENTS ============
CREATE TABLE public.case_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.verification_cases(id) ON DELETE CASCADE,
  from_status public.case_status,
  to_status public.case_status NOT NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_events_case ON public.case_status_events(case_id);

GRANT SELECT, INSERT ON public.case_status_events TO authenticated;
GRANT ALL ON public.case_status_events TO service_role;
ALTER TABLE public.case_status_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Status events - read via case access" ON public.case_status_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.verification_cases c
    WHERE c.id = case_id
      AND (c.assigned_to = auth.uid() OR public.has_role(auth.uid(),'manager'))
  ));

CREATE POLICY "Status events - insert by case actor" ON public.case_status_events
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.verification_cases c
      WHERE c.id = case_id
        AND (c.assigned_to = auth.uid() OR public.has_role(auth.uid(),'manager'))
    )
  );

-- ============ STORAGE POLICIES ============
-- verification-evidence and signatures buckets are private.
-- Paths are organized as {case_id}/... so we can scope policies via the leading folder.

CREATE POLICY "Evidence - read via case access" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-evidence'
    AND EXISTS (
      SELECT 1 FROM public.verification_cases c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.assigned_to = auth.uid() OR public.has_role(auth.uid(),'manager'))
    )
  );

CREATE POLICY "Evidence - write own case" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-evidence'
    AND EXISTS (
      SELECT 1 FROM public.verification_cases c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Evidence - delete own case" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'verification-evidence'
    AND EXISTS (
      SELECT 1 FROM public.verification_cases c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Signatures - read via case access" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'signatures'
    AND EXISTS (
      SELECT 1 FROM public.verification_cases c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND (c.assigned_to = auth.uid() OR public.has_role(auth.uid(),'manager'))
    )
  );

CREATE POLICY "Signatures - write own case" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'signatures'
    AND EXISTS (
      SELECT 1 FROM public.verification_cases c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.assigned_to = auth.uid()
    )
  );
