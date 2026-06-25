import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type SB = SupabaseClient<Database>;

const SIGNED_URL_TTL = 60 * 60 * 12; // 12 hours

const EVIDENCE_CATEGORIES = [
  "applicantPhotos",
  "coApplicantPhotos",
  "residencePhotos",
  "employmentPhotos",
  "identityDocs",
  "incomeDocs",
  "additionalDocs",
] as const;

async function resolveCaseUuid(
  supabase: SB,
  userId: string,
  caseNumber: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("verification_cases")
    .select("id")
    .eq("case_number", caseNumber)
    .eq("assigned_to", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Case ${caseNumber} not found`);
  return data.id as string;
}

async function resolveApplicantUuid(
  supabase: SB,
  caseUuid: string,
  localId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from("applicants")
    .select("id")
    .eq("case_id", caseUuid)
    .eq("local_id", localId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`Applicant ${localId} not found`);
  return data.id as string;
}

function extFromName(name: string, mime: string): string {
  const dot = name.lastIndexOf(".");
  if (dot >= 0 && dot < name.length - 1) return name.slice(dot + 1).toLowerCase();
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "application/pdf") return "pdf";
  return "bin";
}

function base64ToBytes(b64: string): Uint8Array {
  // Accept data URLs and raw base64
  const comma = b64.indexOf(",");
  const raw = comma >= 0 && b64.startsWith("data:") ? b64.slice(comma + 1) : b64;
  const bin = atob(raw);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// -------------------- Upload Evidence --------------------

const UploadEvidenceInput = z.object({
  caseNumber: z.string().min(1),
  applicantLocalId: z.string().min(1),
  category: z.enum(EVIDENCE_CATEGORIES),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  fileBase64: z.string().min(1),
});

export const uploadEvidenceFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UploadEvidenceInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const caseUuid = await resolveCaseUuid(supabase, userId, data.caseNumber);
    const applicantUuid = await resolveApplicantUuid(supabase, caseUuid, data.applicantLocalId);

    const bytes = base64ToBytes(data.fileBase64);
    const ext = extFromName(data.fileName, data.mimeType);
    const objectName = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `${caseUuid}/${applicantUuid}/${data.category}/${objectName}`;

    const { error: upErr } = await supabase.storage
      .from("verification-evidence")
      .upload(storagePath, bytes, { contentType: data.mimeType, upsert: false });
    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

    const { data: row, error: insErr } = await supabase
      .from("uploads")
      .insert({
        case_id: caseUuid,
        applicant_id: applicantUuid,
        category: data.category,
        bucket: "verification-evidence",
        storage_path: storagePath,
        file_name: data.fileName,
        mime_type: data.mimeType,
        size_bytes: data.sizeBytes,
        uploaded_by: userId,
      })
      .select("id, uploaded_at")
      .single();
    if (insErr || !row) {
      // best-effort cleanup
      await supabase.storage.from("verification-evidence").remove([storagePath]);
      throw new Error(`Failed to record upload: ${insErr?.message ?? "unknown"}`);
    }

    const { data: signed, error: sErr } = await supabase.storage
      .from("verification-evidence")
      .createSignedUrl(storagePath, SIGNED_URL_TTL);
    if (sErr || !signed) throw new Error(`Failed to sign URL: ${sErr?.message ?? "unknown"}`);

    return {
      id: row.id as string,
      name: data.fileName,
      size: data.sizeBytes,
      type: data.mimeType,
      uploadedAt: row.uploaded_at as string,
      storagePath,
      dataUrl: signed.signedUrl,
    };
  });

// -------------------- Delete Upload --------------------

export const deleteUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ uploadId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("uploads")
      .select("id, bucket, storage_path")
      .eq("id", data.uploadId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: true };
    await supabase.storage.from(row.bucket as string).remove([row.storage_path as string]);
    const { error: delErr } = await supabase.from("uploads").delete().eq("id", row.id as string);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });

// -------------------- Upload Signature --------------------

const UploadSignatureInput = z.object({
  caseNumber: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  fileBase64: z.string().min(1),
});

export const uploadSignature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UploadSignatureInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const caseUuid = await resolveCaseUuid(supabase, userId, data.caseNumber);

    // Remove previous signature rows + objects for this case to keep "latest only".
    const { data: prev } = await supabase
      .from("uploads")
      .select("id, storage_path")
      .eq("case_id", caseUuid)
      .eq("category", "signature");
    if (prev && prev.length > 0) {
      const paths = prev.map((r) => r.storage_path as string);
      await supabase.storage.from("signatures").remove(paths);
      await supabase
        .from("uploads")
        .delete()
        .in(
          "id",
          prev.map((r) => r.id as string),
        );
    }

    const bytes = base64ToBytes(data.fileBase64);
    const ext = extFromName(data.fileName, data.mimeType);
    const objectName = `${crypto.randomUUID()}.${ext}`;
    const storagePath = `${caseUuid}/${userId}/${objectName}`;

    const { error: upErr } = await supabase.storage
      .from("signatures")
      .upload(storagePath, bytes, { contentType: data.mimeType, upsert: false });
    if (upErr) throw new Error(`Signature upload failed: ${upErr.message}`);

    const { error: insErr } = await supabase.from("uploads").insert({
      case_id: caseUuid,
      applicant_id: null,
      category: "signature",
      bucket: "signatures",
      storage_path: storagePath,
      file_name: data.fileName,
      mime_type: data.mimeType,
      size_bytes: data.sizeBytes,
      uploaded_by: userId,
    });
    if (insErr) {
      await supabase.storage.from("signatures").remove([storagePath]);
      throw new Error(`Failed to record signature: ${insErr.message}`);
    }

    const { data: signed, error: sErr } = await supabase.storage
      .from("signatures")
      .createSignedUrl(storagePath, SIGNED_URL_TTL);
    if (sErr || !signed) throw new Error(`Failed to sign URL: ${sErr?.message ?? "unknown"}`);

    return { storagePath, signedUrl: signed.signedUrl };
  });
