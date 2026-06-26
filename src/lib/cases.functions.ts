import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  MODULE_KEYS,
  type CaseStatus,
  type ModuleData,
  type ModuleKey,
  type VerificationCase,
} from "@/lib/verification-store";

const ModuleDataSchema = z.object({
  status: z.enum(["not_started", "in_progress", "completed"]),
}).passthrough();

const CasePayload = z.object({
  caseNumber: z.string().min(1),
  loanType: z.string(),
  bankName: z.string(),
  branchName: z.string().nullable().optional(),
  loanAmount: z.string().nullable().optional(),
  status: z.enum(["draft", "in_progress", "submitted", "approved", "rejected"]),
  activeApplicantLocalId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  applicants: z.array(
    z.object({
      localId: z.string().min(1),
      isPrimary: z.boolean(),
      position: z.number().int().min(0),
    }),
  ),
  modules: z.record(
    z.string(),
    z.record(z.string(), ModuleDataSchema),
  ),
});

export type CasePayloadInput = z.infer<typeof CasePayload>;

const MODULE_KEY_SET = new Set<string>(MODULE_KEYS);

const CASE_SELECT =
  "id, case_number, loan_type, bank_name, branch_name, loan_amount, status, active_applicant_id, created_at, assigned_to, reviewed_by, review_notes, reviewed_at";

type CaseRow = {
  id: string;
  case_number: string;
  loan_type: string;
  bank_name: string;
  branch_name: string | null;
  loan_amount: string | null;
  status: string;
  active_applicant_id: string | null;
  created_at: string;
  assigned_to: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
};

/**
 * Build fully-hydrated VerificationCase objects (applicants, modules, evidence
 * signed URLs and CA signature) for the given case rows. Shared by the
 * executive's own-case listing and the manager review listing.
 */
async function buildCases(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  caseRows: CaseRow[],
  nameById: Map<string, string>,
): Promise<VerificationCase[]> {
  if (caseRows.length === 0) return [];
  const caseIds = caseRows.map((r) => r.id);

  const [{ data: appRows, error: aErr }, { data: modRows, error: mErr }] = await Promise.all([
    supabase
      .from("applicants")
      .select("id, case_id, local_id, is_primary, position")
      .in("case_id", caseIds)
      .order("position", { ascending: true }),
    supabase
      .from("verification_modules")
      .select("applicant_id, module_key, status, data"),
  ]);
  if (aErr) throw new Error(aErr.message);
  if (mErr) throw new Error(mErr.message);

  type AppRow = { id: string; case_id: string; local_id: string; is_primary: boolean; position: number };
  type ModRow = { applicant_id: string; module_key: string; status: string; data: unknown };

  const appsByCase = new Map<string, AppRow[]>();
  for (const a of (appRows ?? []) as AppRow[]) {
    const list = appsByCase.get(a.case_id) ?? [];
    list.push(a);
    appsByCase.set(a.case_id, list);
  }
  const modsByApplicant = new Map<string, ModRow[]>();
  for (const m of (modRows ?? []) as ModRow[]) {
    const list = modsByApplicant.get(m.applicant_id) ?? [];
    list.push(m);
    modsByApplicant.set(m.applicant_id, list);
  }

  // Fetch uploads for all cases in one go, then build signed URLs.
  const { data: uploadRows, error: uErr } = await supabase
    .from("uploads")
    .select("id, case_id, applicant_id, category, bucket, storage_path, file_name, mime_type, size_bytes, uploaded_at")
    .in("case_id", caseIds);
  if (uErr) throw new Error(uErr.message);

  type UploadRow = {
    id: string; case_id: string; applicant_id: string | null; category: string; bucket: string;
    storage_path: string; file_name: string; mime_type: string | null; size_bytes: number | null; uploaded_at: string;
  };
  const uploads = (uploadRows ?? []) as UploadRow[];

  const signedByPath = new Map<string, string>();
  if (uploads.length > 0) {
    const byBucket = new Map<string, string[]>();
    for (const u of uploads) {
      const arr = byBucket.get(u.bucket) ?? [];
      arr.push(u.storage_path);
      byBucket.set(u.bucket, arr);
    }
    for (const [bucket, paths] of byBucket.entries()) {
      const { data: signs } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 60 * 12);
      for (const s of (signs ?? []) as { path: string | null; signedUrl: string | null }[]) {
        if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
      }
    }
  }

  const sigByCaseUuid = new Map<string, { path: string; url: string }>();
  type EvFile = { id: string; name: string; size: number; type: string; uploadedAt: string; dataUrl: string; storagePath: string };
  const evByAppCat = new Map<string, Map<string, EvFile[]>>();
  for (const u of uploads) {
    const signed = signedByPath.get(u.storage_path) ?? "";
    if (u.category === "signature") {
      sigByCaseUuid.set(u.case_id, { path: u.storage_path, url: signed });
      continue;
    }
    if (!u.applicant_id) continue;
    const catMap = evByAppCat.get(u.applicant_id) ?? new Map<string, EvFile[]>();
    const list = catMap.get(u.category) ?? [];
    list.push({
      id: u.id,
      name: u.file_name,
      size: Number(u.size_bytes ?? 0),
      type: u.mime_type ?? "",
      uploadedAt: u.uploaded_at,
      dataUrl: signed,
      storagePath: u.storage_path,
    });
    catMap.set(u.category, list);
    evByAppCat.set(u.applicant_id, catMap);
  }

  const built: VerificationCase[] = [];
  for (const c of caseRows) {
    const apps = appsByCase.get(c.id) ?? [];
    const modules: Record<string, Record<ModuleKey, ModuleData>> = {};
    for (const a of apps) {
      const mods: Record<ModuleKey, ModuleData> = {} as Record<ModuleKey, ModuleData>;
      for (const k of MODULE_KEYS) mods[k] = { status: "not_started" };
      for (const m of modsByApplicant.get(a.id) ?? []) {
        if (!MODULE_KEY_SET.has(m.module_key)) continue;
        mods[m.module_key as ModuleKey] = {
          status: m.status as ModuleData["status"],
          ...(m.data as Record<string, unknown>),
        } as ModuleData;
      }
      const catMap = evByAppCat.get(a.id);
      if (catMap && catMap.size > 0) {
        const evidence: Record<string, EvFile[]> = {};
        for (const [cat, list] of catMap.entries()) evidence[cat] = list;
        mods.evidence = { ...(mods.evidence ?? { status: "not_started" }), evidence } as ModuleData;
      }
      if (a.is_primary) {
        const sig = sigByCaseUuid.get(c.id);
        if (sig) {
          const gen = (mods.general?.general as Record<string, unknown> | undefined) ?? {};
          mods.general = {
            ...(mods.general ?? { status: "not_started" }),
            general: { ...gen, caSignaturePath: sig.path, caSignatureDataUrl: sig.url },
          } as ModuleData;
        }
      }
      modules[a.local_id] = mods;
    }
    built.push({
      id: c.case_number,
      dbId: c.id,
      loanType: c.loan_type,
      bankName: c.bank_name,
      branchName: c.branch_name ?? "",
      loanAmount: c.loan_amount ?? "",
      createdAt: c.created_at,
      status: c.status as CaseStatus,
      applicants: apps.map((a) => ({ id: a.local_id, isPrimary: a.is_primary })),
      activeApplicantId:
        c.active_applicant_id ?? apps.find((a) => a.is_primary)?.local_id ?? "primary",
      modules,
      assignedToName: c.assigned_to ? nameById.get(c.assigned_to) ?? "" : "",
      reviewedByName: c.reviewed_by ? nameById.get(c.reviewed_by) ?? "" : "",
      reviewedAt: c.reviewed_at,
      reviewNotes: c.review_notes,
    });
  }
  return built;
}

/** Resolve user UUIDs to display names via the service-role client (RLS-bypassing, read-only). */
async function fetchNamesByIds(ids: Array<string | null | undefined>): Promise<Map<string, string>> {
  const uniq = [...new Set(ids.filter((x): x is string => !!x))];
  const map = new Map<string, string>();
  if (uniq.length === 0) return map;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", uniq);
  for (const r of (data ?? []) as { id: string; full_name: string | null }[]) {
    map.set(r.id, r.full_name ?? "");
  }
  return map;
}

/** Throw unless the given user holds the manager role. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertManager(supabase: any, userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "manager")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: manager role required");
}

// -------------------------- LIST (executive's own cases) --------------------------

export const listMyCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: caseRows, error: cErr } = await supabase
      .from("verification_cases")
      .select(CASE_SELECT)
      .eq("assigned_to", userId)
      .order("created_at", { ascending: false });
    if (cErr) throw new Error(cErr.message);
    const rows = (caseRows ?? []) as CaseRow[];
    if (rows.length === 0) {
      return { cases: {} as Record<string, VerificationCase>, caseOrder: [] as string[] };
    }

    const nameById = await fetchNamesByIds(rows.map((r) => r.reviewed_by));
    const built = await buildCases(supabase, rows, nameById);

    const cases: Record<string, VerificationCase> = {};
    const caseOrder: string[] = [];
    for (const c of built) {
      cases[c.id] = c;
      caseOrder.push(c.id);
    }
    return { cases, caseOrder };
  });

// -------------------------- LIST (manager review queue) --------------------------

export const listReviewCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId);

    const { data: caseRows, error: cErr } = await supabase
      .from("verification_cases")
      .select(CASE_SELECT)
      .in("status", ["submitted", "approved", "rejected"])
      .order("created_at", { ascending: false });
    if (cErr) throw new Error(cErr.message);
    const rows = (caseRows ?? []) as CaseRow[];
    if (rows.length === 0) {
      return { cases: {} as Record<string, VerificationCase>, caseOrder: [] as string[] };
    }

    const nameById = await fetchNamesByIds([
      ...rows.map((r) => r.assigned_to),
      ...rows.map((r) => r.reviewed_by),
    ]);
    const built = await buildCases(supabase, rows, nameById);

    // Key manager review cases by their DB UUID — case numbers are only unique
    // per executive, so they can collide across accounts.
    const cases: Record<string, VerificationCase> = {};
    const caseOrder: string[] = [];
    for (const c of built) {
      const key = c.dbId ?? c.id;
      cases[key] = c;
      caseOrder.push(key);
    }
    return { cases, caseOrder };
  });

// -------------------------- UPSERT --------------------------

export const upsertCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CasePayload.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 0. Managers review only — they never own or edit cases. Block their writes
    //    server-side so a manager session can never create a duplicate case row
    //    (case_number + assigned_to lookup would otherwise insert under the manager).
    const { data: mgrRow, error: mgrErr } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "manager")
      .maybeSingle();
    if (mgrErr) throw new Error(mgrErr.message);
    if (mgrRow) throw new Error("Forbidden: managers cannot edit cases");

    // 1. Resolve the user's own case row. Case numbers are visible per account,
    //    so another user's VER-YYYY-#### must never be treated as this user's row.
    const { data: existingCase, error: exCErr } = await supabase
      .from("verification_cases")
      .select("id")
      .eq("case_number", data.caseNumber)
      .eq("assigned_to", userId)
      .maybeSingle();
    if (exCErr) throw new Error(exCErr.message);

    const caseFields = {
      loan_type: data.loanType,
      bank_name: data.bankName,
      branch_name: data.branchName ?? null,
      loan_amount: data.loanAmount ?? null,
      status: data.status,
      active_applicant_id: data.activeApplicantLocalId ?? null,
    };

    let caseId: string;
    if (existingCase) {
      const { data: updRow, error: updErr } = await supabase
        .from("verification_cases")
        .update(caseFields)
        .eq("id", existingCase.id)
        .select("id")
        .single();
      if (updErr || !updRow) throw new Error(updErr?.message ?? "Failed to update case");
      caseId = updRow.id as string;
    } else {
      const { data: insRow, error: insErr } = await supabase
        .from("verification_cases")
        .insert({ ...caseFields, case_number: data.caseNumber, assigned_to: userId })
        .select("id")
        .single();
      if (insErr || !insRow) throw new Error(insErr?.message ?? "Failed to create case");
      caseId = insRow.id as string;
    }

    // 2. Reconcile applicants. Fetch current rows, diff, then delete-by-id.
    //
    // GUARD (Fix #1): If the incoming payload contains zero applicants, treat
    // this as a non-destructive partial sync. Wiping existing applicants would
    // orphan every upload tied to them and is almost always a serialization
    // bug from the client (e.g. an incomplete cloud snapshot got merged into
    // local state). We log loudly so this can never silently destroy data.
    if (!data.applicants || data.applicants.length === 0) {
      console.warn("[upsertCase] empty applicants payload — skipping applicant reconcile", {
        caseNumber: data.caseNumber,
        caseId,
      });
    } else {
      const { data: existingApps, error: exErr } = await supabase
        .from("applicants")
        .select("id, local_id")
        .eq("case_id", caseId);
      if (exErr) throw new Error(exErr.message);
      const incomingSet = new Set(data.applicants.map((a) => a.localId));
      const toDelete = (existingApps ?? []).filter((a) => !incomingSet.has(a.local_id)).map((a) => a.id);
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from("applicants").delete().in("id", toDelete);
        if (delErr) throw new Error(delErr.message);
      }

      const { error: upAErr } = await supabase
        .from("applicants")
        .upsert(
          data.applicants.map((a) => ({
            case_id: caseId,
            local_id: a.localId,
            is_primary: a.isPrimary,
            position: a.position,
          })),
          { onConflict: "case_id,local_id" },
        );
      if (upAErr) throw new Error(upAErr.message);
    }

    // 3. Re-fetch applicant ids for module upserts.
    const { data: appRows, error: aErr } = await supabase
      .from("applicants")
      .select("id, local_id")
      .eq("case_id", caseId);
    if (aErr) throw new Error(aErr.message);
    const localToId = new Map<string, string>();
    for (const a of appRows ?? []) localToId.set(a.local_id, a.id);

    // 4. Upsert modules.
    const moduleRows: Array<Record<string, unknown>> = [];
    for (const [localId, mods] of Object.entries(data.modules)) {
      const applicantId = localToId.get(localId);
      if (!applicantId) continue;
      for (const [key, m] of Object.entries(mods)) {
        if (!MODULE_KEY_SET.has(key)) continue;
        const { status, ...rest } = m as ModuleData & Record<string, unknown>;
        // Strip authoritative-elsewhere fields so the uploads table stays the source of truth.
        if (key === "evidence" && "evidence" in rest) {
          delete (rest as Record<string, unknown>).evidence;
        }
        if (key === "general" && rest.general && typeof rest.general === "object") {
          const g = { ...(rest.general as Record<string, unknown>) };
          delete g.caSignatureDataUrl; // signed URLs are transient
          (rest as Record<string, unknown>).general = g;
        }
        moduleRows.push({
          applicant_id: applicantId,
          module_key: key as ModuleKey,
          status: status,
          data: rest as Record<string, unknown>,
          updated_by: userId,
        });
      }
    }
    if (moduleRows.length > 0) {
      const { error: mErr } = await supabase
        .from("verification_modules")
        .upsert(moduleRows as never, { onConflict: "applicant_id,module_key" });
      if (mErr) throw new Error(mErr.message);
    }

    return { ok: true, caseId };
  });

// -------------------------- DELETE --------------------------

export const deleteCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ caseNumber: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("verification_cases")
      .delete()
      .eq("case_number", data.caseNumber)
      .eq("assigned_to", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------------------------- SUBMIT (executive) --------------------------

export const submitCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ caseNumber: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error: fErr } = await supabase
      .from("verification_cases")
      .select("id, status")
      .eq("case_number", data.caseNumber)
      .eq("assigned_to", userId)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!row) throw new Error("Case not found");

    const fromStatus = row.status;
    // Only draft / in-progress / rejected cases can be submitted for approval.
    if (!["draft", "in_progress", "rejected"].includes(fromStatus)) {
      throw new Error(`Case cannot be submitted from "${fromStatus}" status`);
    }

    const { error: updErr } = await supabase
      .from("verification_cases")
      .update({ status: "submitted" })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);

    const { error: evtErr } = await supabase.from("case_status_events").insert({
      case_id: row.id,
      from_status: fromStatus,
      to_status: "submitted",
      actor_id: userId,
    });
    if (evtErr) throw new Error(evtErr.message);

    return { ok: true, status: "submitted" as CaseStatus };
  });

// -------------------------- REVIEW (manager) --------------------------

export const reviewCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        caseId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        notes: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertManager(supabase, userId);

    // A rejection must always carry an explanatory note.
    const notes = data.notes?.trim() ? data.notes.trim() : null;
    if (data.action === "reject" && !notes) {
      throw new Error("A note is required when rejecting a case");
    }

    const { data: row, error: fErr } = await supabase
      .from("verification_cases")
      .select("id, status")
      .eq("id", data.caseId)
      .maybeSingle();
    if (fErr) throw new Error(fErr.message);
    if (!row) throw new Error("Case not found");

    const fromStatus = row.status;
    // Only submitted cases can be reviewed.
    if (fromStatus !== "submitted") {
      throw new Error(`Case cannot be reviewed from "${fromStatus}" status`);
    }

    const newStatus: CaseStatus = data.action === "approve" ? "approved" : "rejected";
    const reviewedAt = new Date().toISOString();

    const { error: updErr } = await supabase
      .from("verification_cases")
      .update({
        status: newStatus,
        reviewed_by: userId,
        reviewed_at: reviewedAt,
        review_notes: notes,
      })
      .eq("id", row.id);
    if (updErr) throw new Error(updErr.message);

    const { error: evtErr } = await supabase.from("case_status_events").insert({
      case_id: row.id,
      from_status: fromStatus,
      to_status: newStatus,
      actor_id: userId,
      comment: notes,
    });
    if (evtErr) throw new Error(evtErr.message);

    return { ok: true, status: newStatus, reviewedAt };
  });
