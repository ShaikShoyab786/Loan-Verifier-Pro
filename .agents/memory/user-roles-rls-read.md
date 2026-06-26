---
name: Reading user_roles must go through has_role(), not direct SELECT
description: Why role checks must call the has_role RPC instead of selecting user_roles
---

# Never SELECT user_roles directly from a user-scoped client

The `public.user_roles` table has a permissive `"Users read own roles"` SELECT policy,
but it ALSO had a restrictive `"Block role self-assignment"` policy defined as
`FOR ALL ... USING(false)`. Restrictive policies are AND-ed with permissive ones and
`FOR ALL` includes SELECT, so the read policy was cancelled — **authenticated users
could never read their own roles**. Direct `.from("user_roles").select()` returns empty
for everyone, so every account silently resolved to "executive" and managers could
never reach the manager UI.

**Rule:** All role checks (client beforeLoad role detection, server assertManager,
manager write-blocks) must call the SECURITY DEFINER function
`supabase.rpc("has_role", { _user_id, _role })`, which bypasses RLS. Do NOT select
from `user_roles` with a user-scoped (anon/auth) client.

**Why:** has_role() is SECURITY DEFINER + granted to authenticated, so it reads roles
regardless of the table's RLS. Direct selects are blocked by the restrictive policy.

**How to apply:** The schema file (`supabase/setup_new_project.sql`) was corrected so
the restrictive deny targets INSERT/UPDATE/DELETE only — but live databases created
from the old script still have the broken `FOR ALL` policy, so keep using has_role()
in app code; do not switch back to direct selects assuming the live DB is fixed.
