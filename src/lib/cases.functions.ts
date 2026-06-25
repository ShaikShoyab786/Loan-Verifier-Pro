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

// -------------------------- LIST --------------------------

export const listMyCases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: caseRows, error: cErr } = await supabase
      .from("verification_cases")
      .select("id, case_number, loan_type, bank_name, branch_name, loan_amount, status, active_applicant_id, created_at")
      .eq("assigned_to", userId)
      .order("created_at", { ascending: false });
    if (cErr) throw new Error(cErr.message);
    if (!caseRows || caseRows.length === 0) {
      return { cases: {} as Record<string, VerificationCase>, caseOrder: [] as string[] };
    }

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

    const appsByCase = new Map<string, typeof appRows>();
    for (const a of appRows ?? []) {
      const list = appsByCase.get(a.case_id) ?? [];
      list.push(a);
      appsByCase.set(a.case_id, list);
    }
    const modsByApplicant = new Map<string, NonNullable<typeof modRows>>();
    for (const m of modRows ?? []) {
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

    const signedByPath = new Map<string, string>();
    if (uploadRows && uploadRows.length > 0) {
      // Group by bucket to use createSignedUrls batch API.
      const byBucket = new Map<string, string[]>();
      for (const u of uploadRows) {
        const arr = byBucket.get(u.bucket as string) ?? [];
        arr.push(u.storage_path as string);
        byBucket.set(u.bucket as string, arr);
      }
      for (const [bucket, paths] of byBucket.entries()) {
        const { data: signs } = await supabase.storage.from(bucket).createSignedUrls(paths, 60 * 60 * 12);
        for (const s of signs ?? []) {
          if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
        }
      }
    }

    // Index applicantUuid -> localId (per case)
    const appUuidToLocal = new Map<string, string>();
    for (const a of appRows ?? []) appUuidToLocal.set(a.id, a.local_id);

    // signature path per case_id
    const sigByCaseUuid = new Map<string, { path: string; url: string }>();
    // evidence files per applicantUuid per category
    type EvFile = { id: string; name: string; size: number; type: string; uploadedAt: string; dataUrl: string; storagePath: string };
    const evByAppCat = new Map<string, Map<string, EvFile[]>>();
    for (const u of uploadRows ?? []) {
      const signed = signedByPath.get(u.storage_path as string) ?? "";
      if (u.category === "signature") {
        sigByCaseUuid.set(u.case_id as string, { path: u.storage_path as string, url: signed });
        continue;
      }
      if (!u.applicant_id) continue;
      const catMap = evByAppCat.get(u.applicant_id) ?? new Map<string, EvFile[]>();
      const list = catMap.get(u.category as string) ?? [];
      list.push({
        id: u.id as string,
        name: u.file_name as string,
        size: Number(u.size_bytes ?? 0),
        type: (u.mime_type as string) ?? "",
        uploadedAt: u.uploaded_at as string,
        dataUrl: signed,
        storagePath: u.storage_path as string,
      });
      catMap.set(u.category as string, list);
      evByAppCat.set(u.applicant_id, catMap);
    }

    const cases: Record<string, VerificationCase> = {};
    const caseOrder: string[] = [];
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
        // Merge evidence files from uploads table (authoritative)
        const catMap = evByAppCat.get(a.id);
        if (catMap && catMap.size > 0) {
          const evidence: Record<string, EvFile[]> = {};
          for (const [cat, list] of catMap.entries()) evidence[cat] = list;
          mods.evidence = { ...(mods.evidence ?? { status: "not_started" }), evidence } as ModuleData;
        }
        // Merge signature into primary applicant's general module
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
      cases[c.case_number] = {
        id: c.case_number,
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
      };
      caseOrder.push(c.case_number);
    }
    return { cases, caseOrder };
  });

// -------------------------- UPSERT --------------------------

export const upsertCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CasePayload.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

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
