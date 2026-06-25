import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Save,
  ImageUp,
  User,
  UploadCloud,
  FileText,
  ImageIcon,
  Trash2,
  Eye,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { uploadEvidenceFile, deleteUpload } from "@/lib/uploads.functions";
import { useCaseSync } from "@/lib/case-sync-provider";
import { humanizeUploadError } from "@/lib/upload-errors";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  NON_EMPLOYED_CATEGORIES,
  labelApplicants,
  nextModuleRoute,
  useVerificationStore,
  type EmploymentDetails,
  type EvidenceCategory,
  type EvidenceDetails,
  type EvidenceFile,
} from "@/lib/verification-store";
import { ModuleTopBar } from "@/components/module-top-bar";

export const Route = createFileRoute("/_app/verifications/evidence")({
  head: () => ({ meta: [{ title: "Evidence Upload — VerifyPro" }] }),
  component: EvidenceUploadPage,
});

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const IMG_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const DOC_TYPES = ["application/pdf", ...IMG_TYPES];

type SectionDef = {
  key: EvidenceCategory;
  title: string;
  subtitle: string;
  accept: string;
  allowed: string[];
  examples: string[];
  showOnlyIfCoApplicants?: boolean;
};

const SECTIONS: SectionDef[] = [
  {
    key: "applicantPhotos",
    title: "Applicant Photos",
    subtitle: "Photos of the primary applicant",
    accept: "image/jpeg,image/png,image/jpg",
    allowed: IMG_TYPES,
    examples: ["Applicant Photo", "Applicant With Residence", "Applicant Verification Photo"],
  },
  {
    key: "coApplicantPhotos",
    title: "Co-Applicant Photos",
    subtitle: "Photos of all co-applicants",
    accept: "image/jpeg,image/png,image/jpg",
    allowed: IMG_TYPES,
    examples: ["Co-Applicant Photo", "Co-Applicant With Residence"],
    showOnlyIfCoApplicants: true,
  },
  {
    key: "residencePhotos",
    title: "Residence Verification Photos",
    subtitle: "Field photos captured during residence visit",
    accept: "image/jpeg,image/png,image/jpg",
    allowed: IMG_TYPES,
    examples: ["House Front View", "House Name Plate", "Residence Entrance", "Residence Interior"],
  },
  {
    key: "employmentPhotos",
    title: "Employment / Business Verification Photos",
    subtitle: "Field photos captured at the workplace",
    accept: "image/jpeg,image/png,image/jpg",
    allowed: IMG_TYPES,
    examples: ["Office Front View", "Business Premises", "Name Board", "Workplace Photo"],
  },
  {
    key: "identityDocs",
    title: "Identity Documents",
    subtitle: "Government-issued identity proofs",
    accept: "application/pdf,image/jpeg,image/png,image/jpg",
    allowed: DOC_TYPES,
    examples: ["Aadhaar Card", "PAN Card", "Voter ID", "Driving License"],
  },
  {
    key: "incomeDocs",
    title: "Income Documents",
    subtitle: "Salary, tax and bank related proofs",
    accept: "application/pdf,image/jpeg,image/png,image/jpg",
    allowed: DOC_TYPES,
    examples: ["Salary Slip", "Form-16", "Bank Statement", "IT Returns"],
  },
  {
    key: "additionalDocs",
    title: "Additional Supporting Documents",
    subtitle: "Other supporting evidence relevant to this case",
    accept: "application/pdf,image/jpeg,image/png,image/jpg",
    allowed: DOC_TYPES,
    examples: ["Utility Bills", "Rental Agreement", "Business Registration", "Other Supporting Documents"],
  },
];

const emptyEvidence: EvidenceDetails = {
  applicantPhotos: [],
  coApplicantPhotos: [],
  residencePhotos: [],
  employmentPhotos: [],
  identityDocs: [],
  incomeDocs: [],
  additionalDocs: [],
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    // Fix #3: FileReader.onerror receives a ProgressEvent — convert to Error
    // so callers (and humanizeUploadError) see an actionable message.
    reader.onerror = () => {
      const domErr = reader.error;
      reject(
        new Error(
          `Failed to read file "${file.name}"${domErr ? `: ${domErr.name} ${domErr.message}` : ""}`,
        ),
      );
    };
    reader.onabort = () => reject(new Error(`File read aborted: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function readFileAsBase64(file: File): Promise<string> {
  const url = await readFileAsDataUrl(file);
  const comma = url.indexOf(",");
  return comma >= 0 ? url.slice(comma + 1) : url;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function EvidenceUploadPage() {
  const navigate = useNavigate();
  const activeCaseId = useVerificationStore((s) => s.activeCaseId);
  const isHydrated = useVerificationStore((s) => s.isHydrated);
  const applicants = useVerificationStore((s) => s.applicants);
  const activeId = useVerificationStore((s) => s.activeApplicantId);
  const uploadFn = useServerFn(uploadEvidenceFile);
  const deleteFn = useServerFn(deleteUpload);
  const { flushCase } = useCaseSync();
  const saved = useVerificationStore(
    (s) => s.modules[activeId]?.evidence?.evidence as Partial<EvidenceDetails> | undefined,
  );
  const saveEvidence = useVerificationStore((s) => s.saveEvidence);
  const employment = useVerificationStore(
    (s) => s.modules[activeId]?.employment?.employment as Partial<EmploymentDetails> | undefined,
  );
  const employmentNA = NON_EMPLOYED_CATEGORIES.includes(employment?.employmentCategory ?? "");

  const labeled = useMemo(() => labelApplicants(applicants), [applicants]);
  const activeLabel = labeled.find((a) => a.id === activeId)?.label ?? "Applicant";
  const hasCoApplicants = applicants.some((a) => !a.isPrimary);

  const [files, setFiles] = useState<EvidenceDetails>({ ...emptyEvidence, ...saved });
  const [preview, setPreview] = useState<EvidenceFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = uploading || saving;

  useEffect(() => {
    if (isHydrated && !activeCaseId) {
      console.log("[activeCaseId] evidence:no-active-after-hydrate → /drafts");
      navigate({ to: "/verifications/drafts" });
    }
  }, [isHydrated, activeCaseId, navigate]);

  useEffect(() => {
    setFiles({ ...emptyEvidence, ...(saved ?? {}) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  // Hide employment / income related sections when employment is Not Applicable.
  const EMPLOYMENT_RELATED: EvidenceCategory[] = ["employmentPhotos", "incomeDocs"];
  const visibleSections = SECTIONS.filter(
    (s) =>
      (!s.showOnlyIfCoApplicants || hasCoApplicants) &&
      (!employmentNA || !EMPLOYMENT_RELATED.includes(s.key)),
  );

  const addFiles = async (key: EvidenceCategory, incoming: FileList | File[], allowed: string[]) => {
    if (!activeCaseId) {
      toast.error("No active case");
      return;
    }
    if (busy) return;

    const list = Array.from(incoming);
    // Pre-filter so the loading toast reflects only files we will attempt.
    const queue: File[] = [];
    for (const f of list) {
      if (!allowed.includes(f.type)) {
        toast.error(`${f.name}: unsupported format`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        toast.error("File too large", { description: `${f.name} exceeds 10 MB limit.` });
        continue;
      }
      queue.push(f);
    }
    if (queue.length === 0) return;

    setUploading(true);
    const toastId = toast.loading("Uploading File…", {
      description: `${queue.length} file${queue.length > 1 ? "s" : ""} for ${activeLabel}`,
    });

    console.log("[evidence-upload] start", {
      caseNumber: activeCaseId,
      applicant: activeId,
      category: key,
      count: queue.length,
    });

    try {
      // Ensure the case row exists in the cloud before any upload.
      try {
        await flushCase(activeCaseId);
      } catch (err) {
        console.error("[evidence-upload] flushCase failed", err);
        toast.error("Could not sync case before upload", {
          id: toastId,
          description: humanizeUploadError(err),
        });
        return;
      }

      const accepted: EvidenceFile[] = [];
      const failed: string[] = [];
      for (const f of queue) {
        try {
          console.log("[evidence-upload] file:start", { name: f.name, size: f.size, type: f.type });
          const fileBase64 = await readFileAsBase64(f);
          const row = await uploadFn({
            data: {
              caseNumber: activeCaseId,
              applicantLocalId: activeId,
              category: key,
              fileName: f.name,
              mimeType: f.type,
              sizeBytes: f.size,
              fileBase64,
            },
          });
          console.log("[evidence-upload] file:success", { name: f.name, id: (row as EvidenceFile).id });
          accepted.push(row as EvidenceFile);
        } catch (err) {
          console.error("[evidence-upload] file:failure", { name: f.name, err });
          failed.push(f.name);
          toast.error(`Upload failed: ${f.name}`, {
            description: humanizeUploadError(err),
          });
        }
      }

      if (accepted.length > 0) {
        setFiles((prev) => ({ ...prev, [key]: [...(prev[key] ?? []), ...accepted] }));
      }

      if (accepted.length > 0 && failed.length === 0) {
        toast.success(`${accepted.length} file${accepted.length > 1 ? "s" : ""} uploaded`, {
          id: toastId,
        });
      } else if (accepted.length > 0 && failed.length > 0) {
        toast.warning(`Uploaded ${accepted.length}, failed ${failed.length}`, {
          id: toastId,
          description: failed.join(", "),
        });
      } else {
        toast.error("Upload failed", { id: toastId, description: failed.join(", ") });
      }
    } finally {
      setUploading(false);
    }
  };

  const removeFile = async (key: EvidenceCategory, id: string) => {
    if (busy) return;
    const prev = files[key] ?? [];
    setFiles((p) => ({ ...p, [key]: (p[key] ?? []).filter((f) => f.id !== id) }));
    try {
      console.log("[evidence-upload] delete:start", { id });
      await deleteFn({ data: { uploadId: id } });
      console.log("[evidence-upload] delete:success", { id });
    } catch (err) {
      console.error("[evidence-upload] delete:failure", err);
      toast.error("Failed to delete file", { description: humanizeUploadError(err) });
      setFiles((p) => ({ ...p, [key]: prev }));
    }
  };

  const totals = useMemo(() => {
    return visibleSections.reduce(
      (acc, s) => {
        acc[s.key] = (files[s.key] ?? []).length;
        acc.total += acc[s.key];
        return acc;
      },
      { total: 0 } as Record<string, number>,
    );
  }, [files, visibleSections]);

  const runSave = async (
    status: "in_progress" | "completed",
    successTitle: string,
    successDesc: string,
    navigateTo: string | null,
  ): Promise<boolean> => {
    if (busy) return false;
    setSaving(true);
    const toastId = toast.loading("Saving Verification…");
    console.log("[evidence-save] start", { status, applicant: activeId, totals: totals.total });
    try {
      saveEvidence(activeId, files, status);
      // Flush so the user gets confirmation the cloud accepted the change
      // BEFORE we navigate away from the form.
      if (activeCaseId) {
        try {
          await flushCase(activeCaseId);
        } catch (err) {
          console.error("[evidence-save] flushCase failed", err);
          toast.error("Save failed", { id: toastId, description: humanizeUploadError(err) });
          return false;
        }
      }
      console.log("[evidence-save] success");
      toast.success(successTitle, { id: toastId, description: successDesc });
      if (navigateTo) navigate({ to: navigateTo });
      return true;
    } catch (err) {
      console.error("[evidence-save] failed", err);
      toast.error("Save failed", { id: toastId, description: humanizeUploadError(err) });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () =>
    runSave("in_progress", "Draft saved", `Evidence saved for ${activeLabel}.`, null);

  const handleSaveReturn = () =>
    runSave("in_progress", "Saved", "Returned to workspace.", "/verifications/workspace");

  const handleSaveContinue = () => {
    if (totals.total === 0) {
      toast.error("Upload at least one supporting file before continuing.");
      return;
    }
    const next = nextModuleRoute(
      useVerificationStore.getState().modules[activeId],
      "evidence",
    );
    return runSave(
      "completed",
      "Evidence Upload completed",
      `${activeLabel}'s evidence has been saved.`,
      next,
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <ModuleTopBar />

      <div className="rounded-2xl border border-border bg-card">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 border-b border-border">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <ImageUp className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
              Supporting Documents &amp; Evidence Upload
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Attach all photographic evidence and supporting documents for the final report.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge variant="secondary" className="text-[11px] gap-1.5">
              <User className="h-3 w-3" />
              {activeLabel}
            </Badge>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {visibleSections.map((section) => (
            <UploadSection
              key={section.key}
              section={section}
              files={files[section.key] ?? []}
              onAdd={(list) => addFiles(section.key, list, section.allowed)}
              onRemove={(id) => removeFile(section.key, id)}
              onPreview={(f) => setPreview(f)}
            />
          ))}

          {/* Summary Card */}
          <section className="rounded-xl border border-border/70 bg-background/40 p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-semibold tracking-tight">Evidence Summary</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live count of files uploaded for this applicant.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {visibleSections.map((s) => (
                <SummaryTile key={s.key} label={s.title} count={(files[s.key] ?? []).length} />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-sm font-semibold">Total Files Uploaded</span>
              <span className="text-base font-bold tabular-nums">{totals.total}</span>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="module-action-bar px-3 sm:px-6 py-3 sm:py-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-card sm:bg-muted/30 rounded-b-2xl mobile-actions">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            {uploading && (
              <span className="inline-flex items-center gap-1.5 text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading File…
              </span>
            )}
            {saving && (
              <span className="inline-flex items-center gap-1.5 text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Verification…
              </span>
            )}
            {!busy && "This is the final data collection step before report generation."}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-2 sm:justify-end">
            <Button variant="outline" className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0" onClick={handleSaveDraft} disabled={busy}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Draft
            </Button>
            <Button
              variant="outline"
              className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0"
              onClick={handleSaveReturn}
              disabled={busy}
            >
              Save &amp; Return
            </Button>
            <Button className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0" onClick={handleSaveContinue} disabled={busy}>
              Save &amp; Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>


      {/* Preview Dialog */}
      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{preview?.name}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div className="max-h-[70vh] overflow-auto rounded-lg border border-border bg-muted/30">
              {preview.type.startsWith("image/") ? (
                <img src={preview.dataUrl} alt={preview.name} className="w-full h-auto" />
              ) : (
                <iframe
                  src={preview.dataUrl}
                  title={preview.name}
                  className="w-full h-[70vh] bg-background"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UploadSection({
  section,
  files,
  onAdd,
  onRemove,
  onPreview,
}: {
  section: SectionDef;
  files: EvidenceFile[];
  onAdd: (list: FileList | File[]) => void;
  onRemove: (id: string) => void;
  onPreview: (f: EvidenceFile) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) onAdd(e.dataTransfer.files);
  };

  return (
    <section className="rounded-xl border border-border/70 bg-background/40 p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">{section.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{section.subtitle}</p>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {files.length} file{files.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {/* Examples */}
      {section.examples.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {section.examples.map((ex) => (
            <span
              key={ex}
              className="text-[10px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground"
            >
              {ex}
            </span>
          ))}
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-muted/40"
        }`}
      >
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
          <UploadCloud className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium">Drag &amp; drop files here, or click to browse</p>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          Allowed: {section.allowed.map((t) => t.split("/")[1].toUpperCase()).join(", ")} · Max 10 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={section.accept}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) onAdd(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
            >
              {f.type.startsWith("image/") ? (
                <img
                  src={f.dataUrl}
                  alt={f.name}
                  className="h-10 w-10 rounded-md object-cover border border-border shrink-0"
                />
              ) : (
                <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{f.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatBytes(f.size)} · {formatDate(f.uploadedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(f);
                  }}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Preview
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(f.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SummaryTile({ label, count }: { label: string; count: number }) {
  const hasFiles = count > 0;
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground truncate">{label}</span>
        {hasFiles ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
        ) : (
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
        )}
      </div>
      <p className="text-lg font-semibold tabular-nums mt-1">{count}</p>
    </div>
  );
}
