/**
 * Convert an unknown thrown value into a short, user-readable reason.
 * Used by upload/save flows so users see "Storage permission issue" instead
 * of "Case Failed".
 */
export function humanizeUploadError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Unknown error";
  const m = raw.toLowerCase();

  if (m.includes("not found") || m.includes("case ") && m.includes("not found"))
    return "Case not found. Please return to the workspace and reopen the case.";
  if (m.includes("timeout") || m.includes("timed out"))
    return "Network timeout. Check your connection and retry.";
  if (m.includes("failed to fetch") || m.includes("network") || m.includes("offline"))
    return "Network error. Check your connection and retry.";
  if (m.includes("unauthorized") || m.includes("401") || m.includes("forbidden") || m.includes("403"))
    return "Storage permission issue. Please sign out and sign in again.";
  if (m.includes("payload") && m.includes("large"))
    return "File too large for upload.";
  if (m.includes("exceeds") && m.includes("limit"))
    return raw; // already friendly
  if (m.includes("storage") && m.includes("failed"))
    return "Storage upload failed. Please retry.";
  if (m.includes("signed url") || m.includes("sign url"))
    return "Could not generate file URL. Please retry.";
  if (m.includes("record") && m.includes("upload"))
    return "Failed to save upload record in database.";
  return raw;
}
