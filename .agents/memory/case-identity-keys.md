---
name: Case identity keys (case_number vs dbId)
description: Why manager-side case operations must use the DB UUID, not case_number
---

# Case identity: case_number is NOT globally unique

`verification_cases.case_number` (the human "VER-..." id used as the Zustand store key
for an executive's own cases) is only unique *per executive (assigned_to)*. Two different
executives can have colliding case numbers.

**Rule:** Any cross-executive operation (anything a manager does) must key off the DB
UUID (`verification_cases.id`, surfaced on the client as `VerificationCase.dbId`), never
`case_number`.

**Why:** Managers see cases from many executives at once (review queue). Keying those by
`case_number` would collide and cross-contaminate cases across accounts.

**How to apply:**
- Manager list/review server fns (`listReviewCases`, `reviewCase`) accept/return UUIDs.
- Manager-loaded cases enter the store via `loadExternalCase`, which keys by `dbId` and
  intentionally does NOT `markDirty` — so the cloud-sync provider never pushes a manager's
  read-only copy back to the server.
- Executive-owned flows (`submitCase`, listMyCases) still key by `case_number` scoped to
  `assigned_to`, which is safe.
