import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Download, Printer, Send, CheckCircle2, XCircle, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { reviewCase, submitCase } from "@/lib/cases.functions";
import { useCaseSync } from "@/lib/case-sync-provider";
import {
  FINAL_FEEDBACK_ITEMS,
  isModuleApplicable,
  labelApplicants,
  useVerificationStore,
  type EvidenceFile,
  type GeneralDetails,
  type ModuleData,
  type ModuleKey,
  type VerificationCase,
} from "@/lib/verification-store";


export const Route = createFileRoute("/_app/verifications/report")({
  head: () => ({ meta: [{ title: "Verification Report — VerifyPro" }] }),
  component: ReportPage,
});

const AGENCY = {
  name: "PARVEZ AND NARAYANA",
  subtitle: "CHARTERED ACCOUNTANTS",
  address: [
    "Door No: 59A-21-5/3, Plot No: 103",
    "Road No: 3, Zainab Manzil",
    "Vivekananda Colony",
    "Vijayawada – 520007",
  ],
  phones: ["09014221011", "0866-2541011"],
  email: "parvezandnarayana@gmail.com",
  caName: "PARVEZ MOHAMMED",
};

type Verdict = "positive" | "negative" | "na";

const REPORT_MODULES: { key: ModuleKey; label: string }[] = [
  { key: "general", label: "General Details" },
  { key: "residence", label: "Residence Verification" },
  { key: "employment", label: "Employment / Business Verification" },
  { key: "pan", label: "PAN Verification" },
  { key: "salary", label: "Salary Verification" },
  { key: "documents", label: "Document Verification" },
  { key: "business", label: "Business Activity Verification" },
  { key: "property", label: "Property Details Verification" },
];

const EVIDENCE_GROUPS: { key: keyof typeof EVIDENCE_LABELS; label: string }[] = [
  { key: "applicantPhotos", label: "Applicant Photos" },
  { key: "coApplicantPhotos", label: "Co-Applicant Photos" },
  { key: "residencePhotos", label: "Residence Photos" },
  { key: "employmentPhotos", label: "Office / Business Photos" },
  { key: "identityDocs", label: "Government ID Proofs (PAN / Aadhaar)" },
  { key: "incomeDocs", label: "Salary Slips / Income Documents" },
  { key: "additionalDocs", label: "Other Documents" },
];

const EVIDENCE_LABELS = {
  applicantPhotos: "Applicant Photos",
  coApplicantPhotos: "Co-Applicant Photos",
  residencePhotos: "Residence Photos",
  employmentPhotos: "Office / Business Photos",
  identityDocs: "Government ID Proofs",
  incomeDocs: "Salary Slips",
  additionalDocs: "Other Documents",
} as const;

function formatINR(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "N/A";
  return "₹ " + new Intl.NumberFormat("en-IN").format(n);
}

function dash(v: unknown): string {
  if (v === null || v === undefined) return "N/A";
  const s = String(v).trim();
  return s.length ? s : "N/A";
}

function titleCase(v: string): string {
  if (!v) return "N/A";
  return v
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function moduleVerdict(mod: ModuleData | undefined, key: ModuleKey): Verdict {
  if (!mod) return "na";
  if (mod.status === "not_started") return "na";
  switch (key) {
    case "residence": {
      const d = mod.residence ?? {};
      if (d.addressTallied === "yes" && d.stayConfirmed === "yes") return "positive";
      if (d.addressTallied === "no" || d.stayConfirmed === "no") return "negative";
      return mod.status === "completed" ? "positive" : "na";
    }
    case "employment": {
      const d = mod.employment ?? {};
      if (d.nameBoardSighted === "yes") return "positive";
      if (d.nameBoardSighted === "no") return "negative";
      return mod.status === "completed" ? "positive" : "na";
    }
    case "pan": {
      const d = mod.pan ?? {};
      if (d.finalStatus === "confirmed") return "positive";
      if (d.finalStatus === "not_confirmed") return "negative";
      return mod.status === "completed" ? "positive" : "na";
    }
    case "salary": {
      const d = mod.salary ?? {};
      if (d.serviceConfirmed === "yes") return "positive";
      if (d.serviceConfirmed === "no") return "negative";
      return mod.status === "completed" ? "positive" : "na";
    }
    case "documents": {
      const d = mod.documents ?? {};
      const vals = [d.sealOfOrganization, d.signatureOfAuthority, d.salarySlipDateAmount, d.officeAddressCorrect];
      if (vals.some((v) => v === "not_tallied")) return "negative";
      if (vals.some((v) => v === "tallied")) return "positive";
      return "na";
    }
    case "business": {
      const d = mod.business ?? {};
      if (d.businessActivitySeen === "yes") return "positive";
      if (d.businessActivitySeen === "no") return "negative";
      return mod.status === "completed" ? "positive" : "na";
    }
    case "general":
    default:
      return mod.status === "completed" ? "positive" : "na";
  }
}

function overallOpinion(c: VerificationCase): { label: string; tone: string } {
  let pos = 0;
  let neg = 0;
  let touched = 0;
  for (const a of c.applicants) {
    const mods = c.modules[a.id];
    for (const m of REPORT_MODULES) {
      if (!isModuleApplicable(mods, m.key, c.loanType)) continue;
      const v = moduleVerdict(mods?.[m.key], m.key);
      if (v === "positive") { pos += 1; touched += 1; }
      else if (v === "negative") { neg += 1; touched += 1; }
    }
  }
  if (neg > 0 && neg >= pos) return { label: "NOT SATISFACTORY", tone: "bg-rose-600" };
  if (neg > 0) return { label: "NEGATIVE", tone: "bg-amber-600" };
  if (pos > 0 && touched > 0) return { label: "POSITIVE", tone: "bg-emerald-600" };
  return { label: "PENDING", tone: "bg-slate-500" };
}

/** Aggregate per-module verdict across all applicants for summary display. */
function aggregateModuleVerdict(
  c: VerificationCase,
  key: ModuleKey,
): { status: "verified" | "negative" | "na" | "pending"; label: string } {
  let pos = 0, neg = 0, na = 0, pending = 0, applicable = 0;
  for (const a of c.applicants) {
    const mods = c.modules[a.id];
    if (!isModuleApplicable(mods, key, c.loanType)) { na += 1; continue; }
    applicable += 1;
    const m = mods?.[key];
    if (!m || m.status === "not_started") { pending += 1; continue; }
    const v = moduleVerdict(m, key);
    if (v === "positive") pos += 1;
    else if (v === "negative") neg += 1;
    else pending += 1;
  }
  if (applicable === 0) return { status: "na", label: "Not Applicable" };
  if (neg > 0) return { status: "negative", label: "Adverse Observations" };
  if (pos === applicable) return { status: "verified", label: "Verified" };
  if (pending > 0 && pos === 0) return { status: "pending", label: "Pending" };
  return { status: "verified", label: pos > 0 ? "Partially Verified" : "Pending" };
}



function ReportPage() {
  const navigate = useNavigate();
  const activeCaseId = useVerificationStore((s) => s.activeCaseId);
  const activeCase = useVerificationStore((s) =>
    s.activeCaseId ? s.cases[s.activeCaseId] : null,
  );

  const hydrated = useVerificationStore((s) => s.isHydrated);
  useEffect(() => {
    if (hydrated && !activeCaseId) navigate({ to: "/verifications/new" });
  }, [hydrated, activeCaseId, navigate]);

  const labeledApplicants = useMemo(
    () => (activeCase ? labelApplicants(activeCase.applicants) : []),
    [activeCase],
  );

  const { isManager } = Route.useRouteContext();
  const { flushCase } = useCaseSync();
  const submitFn = useServerFn(submitCase);
  const reviewFn = useServerFn(reviewCase);
  const setCaseStatusLocal = useVerificationStore((s) => s.setCaseStatusLocal);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<HTMLDivElement | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Scale A4 pages (210mm ≈ 794px @96dpi) to fit the available width on
  // smaller screens. Desktop stays at 1:1.
  useLayoutEffect(() => {
    const A4_PX = 794;
    const compute = () => {
      const el = viewportRef.current;
      if (!el) return;
      const styles = window.getComputedStyle(el);
      const horizontalPadding = parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const w = el.getBoundingClientRect().width - horizontalPadding;
      // Fit the full A4 page width to the available space so phones never need
      // horizontal scrolling (like a PDF viewer's "fit to width"). Users can
      // pinch-zoom the browser to read fine print. Desktop stays at 1:1.
      const scale = Math.min(1, Math.max(0.3, (w - 8) / A4_PX));
      el.style.setProperty("--pdf-scale", String(scale));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    if (!pdfRef.current || isDownloading || !activeCase) return;
    setIsDownloading(true);
    const el = viewportRef.current;
    const root = pdfRef.current;
    const exportClassTargets = [document.documentElement, document.body, root];
    const prev = el?.style.getPropertyValue("--pdf-scale");
    console.log("[pdf] generation started");
    try {
      // Reset scale to 1 so html2canvas captures the real A4 layout.
      el?.style.setProperty("--pdf-scale", "1");
      // Swap theme tokens to hex so html2canvas's CSS parser doesn't choke on oklch()/lab().
      exportClassTargets.forEach((target) => target.classList.add("pdf-export"));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      // Clone the report off-screen so we can safely split overflowing
      // sections into new .report-page siblings without disturbing React's
      // on-screen DOM. Each resulting .report-page becomes exactly one PDF page.
      const clone = root.cloneNode(true) as HTMLElement;
      clone.style.position = "absolute";
      clone.style.left = "-100000px";
      clone.style.top = "0";
      clone.style.width = root.getBoundingClientRect().width + "px";
      clone.style.setProperty("--pdf-scale", "1");
      document.body.appendChild(clone);

      // A4 in CSS px at 96dpi.
      const A4_H = (297 * 96) / 25.4;
      const PAD_Y = (18 * 96) / 25.4;
      const SAFETY = 8;
      const USABLE = A4_H - 2 * PAD_Y - SAFETY;

      // Split a .report-page at the first [data-section-start] whose bottom
      // overflows the page's usable area. The overflowing element and all of
      // its subsequent siblings (including across wrapper nesting) move into
      // a freshly-created .report-page that mirrors the original's header.
      const splitOverflow = (page: HTMLElement): HTMLElement | null => {
        const pageRect = page.getBoundingClientRect();
        const contentBottom = pageRect.top + PAD_Y + USABLE;
        const sections = Array.from(
          page.querySelectorAll<HTMLElement>("[data-section-start]"),
        );
        for (const sec of sections) {
          // Never split inside the Page-1 self-contained block.
          if (sec.closest(".report-page-one-block")) continue;
          const r = sec.getBoundingClientRect();
          // Only act on elements that begin inside this page (not already
          // pushed below it by an earlier split iteration).
          if (r.top < pageRect.top || r.top >= pageRect.top + A4_H) continue;
          if (r.bottom <= contentBottom) continue;
          // Don't split if doing so would leave nothing of substance on the
          // current page (only the cloned page header).
          const ancestors: HTMLElement[] = [];
          let n: HTMLElement | null = sec;
          while (n && n !== page) {
            ancestors.unshift(n);
            n = n.parentElement;
          }
          if (ancestors.length === 0) continue;
          if (
            ancestors[0] === page.firstElementChild ||
            ancestors[0].previousElementSibling === null
          ) {
            // First (and only) child of page → can't split usefully; let the
            // natural slice fallback handle truly oversized single sections.
            continue;
          }

          const newPage = page.cloneNode(false) as HTMLElement;
          const header = page.firstElementChild?.cloneNode(true);
          if (header) newPage.appendChild(header);

          let oldParent: HTMLElement = page;
          let newParent: HTMLElement = newPage;
          for (let i = 0; i < ancestors.length; i++) {
            const node = ancestors[i];
            if (i === ancestors.length - 1) {
              let cur: Element | null = node;
              while (cur) {
                const sibling: Element | null = cur.nextElementSibling;
                newParent.appendChild(cur);
                cur = sibling;
              }
            } else {
              const wrap = node.cloneNode(false) as HTMLElement;
              newParent.appendChild(wrap);
              newParent = wrap;
              oldParent = node;
            }
          }
          void oldParent;

          page.parentElement?.insertBefore(newPage, page.nextSibling);
          return newPage;
        }
        return null;
      };

      const queue = Array.from(clone.querySelectorAll<HTMLElement>(".report-page"));
      const MAX_ITER = 500;
      let iter = 0;
      while (queue.length && iter++ < MAX_ITER) {
        const page = queue.shift()!;
        let next: HTMLElement | null = splitOverflow(page);
        while (next && iter++ < MAX_ITER) {
          queue.push(next);
          next = splitOverflow(page);
        }
      }

      // Render each .report-page individually so each becomes one PDF page.
      const allPages = Array.from(
        clone.querySelectorAll<HTMLElement>(".report-page"),
      );
      // Drop empty pages (only header, no real content, no images).
      const pages = allPages.filter((p) => {
        const text = (p.innerText || "").replace(/\s+/g, "").trim();
        const imgs = p.querySelectorAll("img").length;
        const tables = p.querySelectorAll("table").length;
        const sectionStarts = p.querySelectorAll("[data-section-start]").length;
        const rect = p.getBoundingClientRect();
        // Empty / near-empty pages: only a header (or nothing) with no real content.
        // Require a real signal: an image, a table, a data-section-start atomic block,
        // or substantial body text. Also drop pages that ended up visually tiny.
        if (rect.height < 200) return false;
        if (imgs > 0 || tables > 0 || sectionStarts > 0) return true;
        return text.length > 120;
      });
      const targets = pages.length > 0 ? pages : [clone];
      console.log("[pdf] capturing", targets.length, "page(s) (dropped", allPages.length - pages.length, "empty)");

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pdfW = 210;
      const pdfH = 297;

      try {
        for (let i = 0; i < targets.length; i++) {
          const canvas = await html2canvas(targets[i], {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
          });
          console.log(`[pdf] page ${i + 1}/${targets.length} captured`);
          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          const imgH = (canvas.height * pdfW) / canvas.width;
          if (i > 0) pdf.addPage();
          if (imgH <= pdfH + 0.5) {
            pdf.addImage(imgData, "JPEG", 0, 0, pdfW, Math.min(imgH, pdfH));
          } else {
            // Fallback: slice tall content across multiple PDF pages.
            let heightLeft = imgH;
            let position = 0;
            pdf.addImage(imgData, "JPEG", 0, position, pdfW, imgH);
            heightLeft -= pdfH;
            while (heightLeft > 0) {
              position -= pdfH;
              pdf.addPage();
              pdf.addImage(imgData, "JPEG", 0, position, pdfW, imgH);
              heightLeft -= pdfH;
            }
          }
        }
      } finally {
        clone.parentElement?.removeChild(clone);
      }

      pdf.save(`VER-${activeCase.id}.pdf`);
      console.log("[pdf] generation completed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[pdf] generation failed:", msg, err);
      alert(`Failed to generate PDF: ${msg}`);
    } finally {
      exportClassTargets.forEach((target) => target.classList.remove("pdf-export"));
      if (prev !== undefined && prev !== "") {
        el?.style.setProperty("--pdf-scale", prev);
      } else {
        el?.style.removeProperty("--pdf-scale");
      }
      // Recompute scale on next frame.
      window.dispatchEvent(new Event("resize"));
      setIsDownloading(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!activeCase) return;
    setActionBusy(true);
    try {
      await flushCase(activeCase.id);
      await submitFn({ data: { caseNumber: activeCase.id } });
      setCaseStatusLocal(activeCase.id, "submitted");
      toast.success("Submitted for approval", {
        description: `Case ${activeCase.id} has been sent to your manager.`,
      });
      setSubmitOpen(false);
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit case");
    } finally {
      setActionBusy(false);
    }
  };

  const handleReview = async (action: "approve" | "reject") => {
    if (!activeCase?.dbId) {
      toast.error("Missing case reference — cannot review this case");
      return;
    }
    if (action === "reject" && !rejectNotes.trim()) {
      toast.error("Please add a note explaining the rejection");
      return;
    }
    setActionBusy(true);
    try {
      const res = await reviewFn({
        data: {
          caseId: activeCase.dbId,
          action,
          notes: action === "reject" ? rejectNotes.trim() : undefined,
        },
      });
      setCaseStatusLocal(activeCase.dbId, res.status, {
        reviewedAt: res.reviewedAt,
        reviewNotes: action === "reject" ? rejectNotes.trim() : null,
      });
      toast.success(action === "approve" ? "Case approved" : "Case rejected", {
        description:
          action === "approve"
            ? `Case ${activeCase.id} is now available to the executive.`
            : `Case ${activeCase.id} was returned to the executive.`,
      });
      setRejectOpen(false);
      setRejectNotes("");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to review case");
    } finally {
      setActionBusy(false);
    }
  };

  if (!activeCase) return null;

  const fallbackDate = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const primary = labeledApplicants.find((a) => a.isPrimary);
  const coApplicants = labeledApplicants.filter((a) => !a.isPrimary);
  const primaryGeneral = (activeCase.modules[primary?.id ?? ""]?.general?.general ?? {}) as Partial<GeneralDetails>;
  const opinion = overallOpinion(activeCase);

  const formatLocal = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
      : fallbackDate;

  const reportInfo = {
    verificationNumber: activeCase.id,
    udinNumber: dash(primaryGeneral.udinNumber),
    caName: primaryGeneral.caName?.trim() ? primaryGeneral.caName : AGENCY.caName,
    dateOfVerification: formatLocal(primaryGeneral.dateOfVerification),
    dateOfReportSubmission: formatLocal(primaryGeneral.dateOfReportSubmission),
  };


  const status = activeCase.status;
  const canDownload = isManager || status === "approved";
  const canSubmit = !isManager && (status === "draft" || status === "in_progress" || status === "rejected");
  const backTo = isManager ? "/dashboard" : "/verifications/workspace";
  const backLabel = isManager ? "Back to Dashboard" : "Back to Workspace";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {backLabel}
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-muted-foreground">
            PDF · A4 · {activeCase.id}
          </span>

          {canDownload ? (
            <>
              <Button variant="outline" onClick={handlePrint} className="h-9">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownloadPdf} disabled={isDownloading} className="h-9">
                <Download className="h-4 w-4 mr-2" />
                {isDownloading ? "Generating…" : "Download PDF"}
              </Button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 h-9 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" />
              Preview only — download unlocks after approval
            </span>
          )}

          {canSubmit && (
            <Button onClick={() => setSubmitOpen(true)} disabled={actionBusy} className="h-9">
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}

          {!isManager && status === "submitted" && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 h-9 text-xs font-medium text-amber-700">
              <Clock className="h-3.5 w-3.5" />
              Awaiting approval
            </span>
          )}

          {isManager && status === "submitted" && (
            <>
              <Button
                variant="outline"
                onClick={() => setRejectOpen(true)}
                disabled={actionBusy}
                className="h-9 border-destructive/40 text-destructive hover:bg-destructive/5"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleReview("approve")}
                disabled={actionBusy}
                className="h-9 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </>
          )}

          {isManager && status === "approved" && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 h-9 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approved
            </span>
          )}
          {isManager && status === "rejected" && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/5 px-3 h-9 text-xs font-medium text-destructive">
              <XCircle className="h-3.5 w-3.5" />
              Rejected
            </span>
          )}
        </div>
      </div>

      {/* Rejection note banner (visible to executive on returned cases) */}
      {status === "rejected" && activeCase.reviewNotes && (
        <div className="no-print rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
            Returned by manager
          </p>
          <p className="mt-1 text-sm text-foreground">{activeCase.reviewNotes}</p>
        </div>
      )}
      {status === "approved" && !isManager && (
        <div className="no-print rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Approved — you can now download the final report.
          </p>
        </div>
      )}

      {/* Submit-for-approval confirmation */}
      <AlertDialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit this case for approval?</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, the case will be locked for editing and sent to your manager for
              review. You will be able to download the final report after it is approved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleSubmitForApproval();
              }}
              disabled={actionBusy}
            >
              {actionBusy ? "Submitting…" : "Submit for Approval"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject-with-note dialog (manager) */}
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this case</AlertDialogTitle>
            <AlertDialogDescription>
              Add a note explaining what needs to be corrected. The executive will see this and can
              fix and resubmit the case.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            placeholder="e.g. Residence photos are unclear; please re-capture and add the neighbour reference."
            className="min-h-[110px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleReview("reject");
              }}
              disabled={actionBusy || !rejectNotes.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {actionBusy ? "Rejecting…" : "Reject & Return"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div ref={viewportRef} className="report-shell print:py-0">
        <div ref={pdfRef} className="report-pdf-viewport">

        {/* ============ PAGE 1: COVER ============ */}
        <CoverPage
          caseData={activeCase}
          reportInfo={reportInfo}
          primaryName={dash(primaryGeneral.borrowerName)}
          coApplicants={coApplicants.map((c) => ({
            id: c.id,
            label: c.label,
            name: dash(activeCase.modules[c.id]?.general?.general?.borrowerName),
          }))}
          primaryId={primary?.id ?? ""}
          opinion={opinion}
          signatureDataUrl={primaryGeneral.caSignatureDataUrl ?? ""}
        />



        {/* ============ PAGE 2: EXECUTIVE SUMMARY ============ */}
        <ExecutiveSummaryPage
          caseData={activeCase}
          applicants={labeledApplicants.map((a) => ({
            id: a.id,
            label: a.label,
            general: activeCase.modules[a.id]?.general?.general ?? {},
          }))}
        />

        {/* ============ DETAILED MODULE-GROUPED SECTIONS ============ */}
        <ModuleGroupedSections
          caseData={activeCase}
          applicants={labeledApplicants.map((a) => ({
            id: a.id,
            label: a.label,
            name: dash(activeCase.modules[a.id]?.general?.general?.borrowerName),
          }))}
        />


        {/* ============ FINAL CERTIFICATE ============ */}
        <CertificatePage caseData={activeCase} reportInfo={reportInfo} signatureDataUrl={primaryGeneral.caSignatureDataUrl ?? ""} />

        {/* ============ BRANCH HEAD CONFIRMATION ============ */}
        <BranchConfirmationPage caseData={activeCase} />

        {/* ============ SUPPORTING DOCUMENTS ============ */}
        <SupportingDocumentsPages caseData={activeCase} applicants={labeledApplicants} />
        </div>
      </div>
    </div>
  );
}

/* ========================== COVER PAGE ========================== */
type ReportInfo = {
  verificationNumber: string;
  udinNumber: string;
  caName: string;
  dateOfVerification: string;
  dateOfReportSubmission: string;
};

function applicantVerdict(
  c: VerificationCase,
  applicantId: string,
): { label: "Positive" | "Negative" | "Not Applicable"; icon: string; cls: string } {
  const mods = c.modules[applicantId];
  let pos = 0, neg = 0, applicable = 0;
  for (const m of REPORT_MODULES) {
    if (!isModuleApplicable(mods, m.key, c.loanType)) continue;
    applicable += 1;
    const v = moduleVerdict(mods?.[m.key], m.key);
    if (v === "positive") pos += 1;
    else if (v === "negative") neg += 1;
  }
  if (applicable === 0) return { label: "Not Applicable", icon: "○", cls: "text-slate-500" };
  if (neg > 0) return { label: "Negative", icon: "✕", cls: "text-rose-700" };
  if (pos > 0) return { label: "Positive", icon: "✓", cls: "text-emerald-700" };
  return { label: "Not Applicable", icon: "○", cls: "text-slate-500" };
}

function summaryLabel(
  agg: { status: "verified" | "negative" | "na" | "pending" },
): { label: "Positive" | "Negative" | "Not Applicable"; icon: string; cls: string; iconCls: string } {
  if (agg.status === "negative") {
    return { label: "Negative", icon: "✕", cls: "text-rose-700", iconCls: "text-rose-600" };
  }
  if (agg.status === "na") {
    return { label: "Not Applicable", icon: "○", cls: "text-slate-500", iconCls: "text-slate-400" };
  }
  if (agg.status === "pending") {
    return { label: "Not Applicable", icon: "○", cls: "text-slate-500", iconCls: "text-slate-400" };
  }
  return { label: "Positive", icon: "✓", cls: "text-emerald-700", iconCls: "text-emerald-600" };
}

function CoverPage({
  caseData,
  reportInfo,
  primaryName,
  coApplicants,
  primaryId,
  opinion,
  signatureDataUrl,
}: {
  caseData: VerificationCase;
  reportInfo: ReportInfo;
  primaryName: string;
  coApplicants: { id: string; label: string; name: string }[];
  primaryId: string;
  opinion: { label: string; tone: string };
  signatureDataUrl: string;
}) {
  // Build the list of persons for the Final-Feedback summary table.
  // Guarantor is NOT included here — it gets its own block below.
  type PersonRow = {
    id: string;
    label: string;
    name: string;
    items: Partial<Record<string, string>>;
  };
  const primaryFeedback = (caseData.modules[primaryId]?.feedback?.feedback ?? {}) as {
    items?: Record<string, string>;
    guarantorPresent?: string;
    guarantorName?: string;
    guarantorOpinion?: "positive" | "negative" | "";
  };
  const persons: PersonRow[] = [];
  if (primaryId) {
    persons.push({
      id: primaryId,
      label: "Applicant",
      name: primaryName,
      items: primaryFeedback.items ?? {},
    });
  }
  coApplicants.forEach((c) => {
    const fb = (caseData.modules[c.id]?.feedback?.feedback ?? {}) as {
      items?: Record<string, string>;
    };
    persons.push({ id: c.id, label: c.label, name: c.name, items: fb.items ?? {} });
  });

  // Chunk into pairs — max 2 persons per table.
  const personChunks: PersonRow[][] = [];
  for (let i = 0; i < persons.length; i += 2) personChunks.push(persons.slice(i, i + 2));
  const firstChunk = personChunks[0];
  const extraChunks = personChunks.slice(1);
  const hasExtras = extraChunks.length > 0;
  const generatedDateTime = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Guarantor info (separate block).
  const guarantorPresent = primaryFeedback.guarantorPresent === "yes";
  const guarantorOpinion = (primaryFeedback.guarantorOpinion ?? "") as "positive" | "negative" | "";
  const guarantorName = dash(primaryFeedback.guarantorName);

  // Recompute overall opinion strictly from Final Feedback selections + guarantor.
  const fbOpinion = feedbackOverallOpinion(persons, guarantorPresent ? guarantorOpinion : null);

  // Build subject line with bold uppercase names joined naturally
  const allNames = [primaryName, ...coApplicants.map((c) => c.name)].filter((n) => n && n !== "N/A");
  const introNames = allNames.length ? allNames.join(", ") : "the applicant";

  const bankName = caseData.bankName?.trim() || "Bank of India";

  return (
    <>
    <section className="report-page">
      {/* Letterhead — centered, CA-grade (Page-1 compact) */}
      <header className="text-center pb-3 border-b border-slate-900 page-one-letterhead">
        <h1 className="text-[22px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "#0b1f4d" }}>
          {AGENCY.name}
        </h1>
        <p className="mt-0.5 text-[10px] uppercase tracking-[0.4em]" style={{ color: "#0b1f4d" }}>
          {AGENCY.subtitle}
        </p>
        <div className="mx-auto mt-2 h-[1px] w-20" style={{ background: "#0b1f4d" }} />
        <div className="mt-2 grid grid-cols-3 gap-3 text-[10px] leading-[1.35]" style={{ color: "#111827" }}>
          <div className="text-left">
            <div className="font-semibold uppercase tracking-wider text-[9px]" style={{ color: "#0b1f4d" }}>
              Address
            </div>
            {AGENCY.address.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
          <div className="text-center">
            <div className="font-semibold uppercase tracking-wider text-[9px]" style={{ color: "#0b1f4d" }}>
              Phone
            </div>
            {AGENCY.phones.map((p) => (
              <div key={p} className="report-id-value">{p}</div>
            ))}
          </div>
          <div className="text-right">
            <div className="font-semibold uppercase tracking-wider text-[9px]" style={{ color: "#0b1f4d" }}>
              Email
            </div>
            <div>{AGENCY.email}</div>
          </div>
        </div>
      </header>


      {/* Report title */}
      <div className="mt-3 text-center">
        <p className="text-[10px] tracking-[0.35em] text-slate-500">CONFIDENTIAL</p>
        <h2 className="mt-0.5 text-[16px] font-bold text-slate-900">
          DUE DILIGENCE VERIFICATION REPORT
        </h2>
        <div className="mx-auto mt-1.5 h-[2px] w-16 bg-slate-900" />
      </div>

      {/* Letter header: To + Date */}
      <div className="report-no-break mt-3 text-[12px] leading-[1.45] text-slate-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p>To,</p>
            <p className="font-semibold">The Branch Manager</p>
            <p className="font-semibold">{bankName}</p>
            <p className="font-semibold">{dash(caseData.branchName)}</p>
          </div>
          <div className="text-right shrink-0">
            <p>
              <span className="font-semibold">Date:</span>{" "}
              {reportInfo.dateOfReportSubmission}
            </p>
          </div>
        </div>

        <p className="mt-2">Sir,</p>

        {/* Subject */}
        <p className="mt-2">
          <span className="font-semibold">Sub:</span> Due Diligence Verification Report of{" "}
          <span className="font-extrabold uppercase text-slate-900">{primaryName}</span>
          {coApplicants.length > 0 && (
            <>
              {coApplicants.map((c) => (
                <span key={c.id}>
                  <span className="font-semibold"> AND </span>
                  <span className="font-extrabold uppercase text-slate-900">{c.name}</span>
                </span>
              ))}
            </>
          )}{" "}
          <span className="font-semibold">({String(caseData.loanType || "").toUpperCase()}) – Reg.</span>
        </p>

        {/* Introduction */}
        <p className="mt-2 text-justify">
          With reference to our appointment as Due Diligence auditors and with the available
          sources and physical documents provided to us, we are herewith submitting the Due
          Diligence Verification Report of{" "}
          <span className="font-semibold">{introNames}</span> pertaining to the{" "}
          <span className="font-semibold">{dash(caseData.loanType)}</span> proposal.
        </p>
      </div>


      {/* Page-1 self-contained block: First Summary chunk + merged Guarantor / Date / Opinion table.
          Signature is rendered separately AFTER the last summary table. */}
      <div className="report-page-one-block">
        {firstChunk ? (
          <div className="report-no-break mt-3">
            <h3 className="text-[10px] tracking-[0.3em] mb-1.5">
              VERIFICATION SUMMARY
            </h3>
            <FeedbackSummaryTable chunk={firstChunk} />
          </div>
        ) : (
          <div className="report-no-break mt-3 rounded-md border border-dashed border-slate-400 p-3 text-center text-[11px] italic">
            Final Feedback has not been recorded for this case. Complete the Final
            Feedback module to populate the verification summary.
          </div>
        )}

        {/* Merged Guarantor + Date & Time of Visit + Overall Opinion table */}
        {!hasExtras && (
          <div className="report-no-break mt-3">
            <GuarantorOpinionTable
              guarantorPresent={guarantorPresent}
              guarantorName={guarantorName}
              guarantorOpinion={guarantorOpinion}
              visitDateTime={generatedDateTime}
              opinion={fbOpinion}
            />
          </div>
        )}

        {/* Digital signature — only on Page 1 when there are no extra summary pages */}
        {!hasExtras && (
          <div className="report-no-break mt-4 flex justify-end">
            <SignatureBlock
              signatureDataUrl={signatureDataUrl}
              caName={reportInfo.caName}
              udin={reportInfo.udinNumber}
            />
          </div>
        )}
      </div>
    </section>

    {/* Additional summary tables (3+ persons) — each on its own fresh A4 page.
        The last one carries the Guarantor/Opinion merged table and the signature. */}
    {extraChunks.map((chunk, idx) => {
      const isLast = idx === extraChunks.length - 1;
      return (
        <section key={`extra-summary-${idx}`} className="report-page">
          <PageHeader title={`Verification Summary — Continued (${idx + 2})`} caseId={caseData.id} />
          <div className="report-no-break mt-4">
            <FeedbackSummaryTable chunk={chunk} />
          </div>
          {isLast && (
            <>
              <div className="report-no-break mt-4">
                <GuarantorOpinionTable
                  guarantorPresent={guarantorPresent}
                  guarantorName={guarantorName}
                  guarantorOpinion={guarantorOpinion}
                  visitDateTime={generatedDateTime}
                  opinion={fbOpinion}
                />
              </div>
              <div className="report-no-break mt-4 flex justify-end">
                <SignatureBlock
                  signatureDataUrl={signatureDataUrl}
                  caName={reportInfo.caName}
                  udin={reportInfo.udinNumber}
                />
              </div>
            </>
          )}
        </section>
      );
    })}
    </>
  );
}

function GuarantorOpinionTable({
  guarantorPresent,
  guarantorName,
  guarantorOpinion,
  visitDateTime,
  opinion,
}: {
  guarantorPresent: boolean;
  guarantorName: string;
  guarantorOpinion: "positive" | "negative" | "";
  visitDateTime: string;
  opinion: { label: string; tone: string };
}) {
  const guarantorLabel = !guarantorPresent
    ? "N/A"
    : guarantorOpinion === "positive"
      ? "POSITIVE"
      : guarantorOpinion === "negative"
        ? "NEGATIVE"
        : "Not Recorded";
  const guarantorCellCls = !guarantorPresent
    ? "bg-slate-100 text-slate-700"
    : guarantorOpinion === "positive"
      ? "bg-emerald-600 text-white"
      : guarantorOpinion === "negative"
        ? "bg-rose-600 text-white"
        : "bg-slate-100 text-slate-700";
  const opinionCellCls = `${opinion.tone} text-white`;
  const guarantorHeader = guarantorPresent && guarantorName !== "N/A"
    ? `GUARANTOR — ${guarantorName}`
    : "GUARANTOR";
  return (
    <table className="w-full text-[12px] border-collapse bg-white">
      <thead>
        <tr className="bg-slate-900 text-white">
          <th className="border border-slate-300 px-3 py-1.5 text-center w-2/5">
            {guarantorHeader}
          </th>
          <th className="border border-slate-300 px-3 py-1.5 text-center w-1/4">
            DATE &amp; TIME OF VISIT
          </th>
          <th className="border border-slate-300 px-3 py-1.5 text-center">
            OVERALL OPINION
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={`border border-slate-300 px-3 py-2 text-center font-extrabold tracking-widest ${guarantorCellCls}`}>
            {guarantorLabel}
          </td>
          <td className="border border-slate-300 px-3 py-2 text-center font-semibold text-slate-800">
            {visitDateTime}
          </td>
          <td className={`border border-slate-300 px-3 py-2 text-center font-extrabold tracking-widest ${opinionCellCls}`}>
            {opinion.label}
          </td>
        </tr>
      </tbody>
    </table>
  );
}


function FeedbackSummaryTable({
  chunk,
}: {
  chunk: { id: string; label: string; name: string; items: Partial<Record<string, string>> }[];
}) {
  return (
    <table className="w-full text-[12px] border-collapse bg-white">
      <thead>
        <tr className="bg-slate-900 text-white">
          <th className="border border-slate-300 px-3 py-2 text-left w-10">#</th>
          <th className="border border-slate-300 px-3 py-2 text-left">Verification Item</th>
          {chunk.map((p) => (
            <th key={p.id} className="border border-slate-300 px-3 py-2 text-center">
              <div className="font-bold uppercase">{p.label}</div>
              {p.name && p.name !== "N/A" && (
                <div className="text-[10px] font-normal opacity-90 mt-0.5 normal-case">
                  {p.name}
                </div>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {FINAL_FEEDBACK_ITEMS.map((it, i) => (
          <tr key={it.key} className={i % 2 === 0 ? "bg-slate-50" : ""}>
            <td className="border border-slate-300 px-3 py-1.5 text-center font-semibold text-slate-600">
              {i + 1}.
            </td>
            <td className="border border-slate-300 px-3 py-1.5 font-semibold text-slate-700">
              {it.label}
            </td>
            {chunk.map((p) => {
              const v = (p.items[it.key] ?? "") as string;
              return (
                <td
                  key={p.id}
                  className="border border-slate-300 px-3 py-1.5 text-center"
                >
                  <FeedbackBadge value={v} />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FeedbackBadge({ value }: { value: string }) {
  if (value === "positive")
    return <span className="font-bold text-emerald-700">✓ Positive</span>;
  if (value === "negative")
    return <span className="font-bold text-rose-700">✕ Negative</span>;
  if (value === "na")
    return <span className="font-semibold text-slate-500">○ N/A</span>;
  return <span className="text-slate-400 italic">Not recorded</span>;
}

function feedbackOverallOpinion(
  persons: { items: Partial<Record<string, string>> }[],
  guarantorOpinion?: "positive" | "negative" | "" | null,
): { label: string; tone: string } {
  let pos = 0, neg = 0, recorded = 0;
  for (const p of persons) {
    for (const it of FINAL_FEEDBACK_ITEMS) {
      const v = p.items[it.key];
      if (v === "positive") { pos += 1; recorded += 1; }
      else if (v === "negative") { neg += 1; recorded += 1; }
      else if (v === "na") { recorded += 1; }
    }
  }
  if (guarantorOpinion === "positive") { pos += 1; recorded += 1; }
  else if (guarantorOpinion === "negative") { neg += 1; recorded += 1; }
  if (recorded === 0) return { label: "PENDING", tone: "bg-slate-500" };
  if (neg > 0 && neg >= pos) return { label: "NOT SATISFACTORY", tone: "bg-rose-600" };
  if (neg > 0) return { label: "NEGATIVE", tone: "bg-amber-600" };
  if (pos > 0) return { label: "POSITIVE", tone: "bg-emerald-600" };
  return { label: "PENDING", tone: "bg-slate-500" };
}

function SummaryListItem({
  label,
  agg,
}: {
  label: string;
  agg: { status: "verified" | "negative" | "na" | "pending"; label: string };
}) {
  const tone = summaryLabel(agg);
  return (
    <li className="flex items-center justify-between px-4 py-2 text-[13px]">
      <span className="flex items-center gap-3">
        <span className={`text-lg font-bold leading-none ${tone.iconCls}`}>{tone.icon}</span>
        <span className="font-medium text-slate-800">{label}</span>
      </span>
      <span className={`text-xs font-semibold uppercase tracking-wider ${tone.cls}`}>
        {tone.label}
      </span>
    </li>
  );
}

function SignatureBlock({
  signatureDataUrl,
  caName,
  udin,
}: {
  signatureDataUrl: string;
  caName: string;
  udin: string;
}) {
  return (
    <div className="w-72 text-center signature-block">
      <p className="text-[11px] uppercase tracking-[0.25em] mb-2">
        Digitally Signed By
      </p>
      <div className="h-20 flex items-end justify-center signature-art">
        {signatureDataUrl ? (
          <img
            src={signatureDataUrl}
            alt="CA Signature"
            className="max-h-20 max-w-full object-contain"
          />
        ) : (
          <div className="w-full border-b border-slate-400" />
        )}
      </div>
      <div className="mt-3 border-t border-slate-300 pt-2 signature-meta">
        <p className="text-sm font-bold">{caName}</p>
        <p className="text-xs">Chartered Accountant</p>
        <p className="text-[11px] mt-1">
          UDIN: <span className="report-id-value">{udin}</span>
        </p>
      </div>
    </div>
  );
}


function CoverRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <tr className="border-b border-slate-300 last:border-b-0">
      <td className="bg-slate-100 px-3 py-2 w-1/3 font-semibold text-slate-700">{label}</td>
      <td className={`px-3 py-2 ${mono ? "font-mono" : ""}`}>{value}</td>
    </tr>
  );
}

/* ====================== EXECUTIVE SUMMARY ====================== */
function ExecutiveSummaryPage({
  caseData,
  applicants,
}: {
  caseData: VerificationCase;
  applicants: { id: string; label: string; general: Record<string, unknown> }[];
}) {
  // Only show notes the user actually generated/edited in the workspace.
  // No auto-synthesized fallback paragraphs.
  const residenceEntries = applicants
    .map((ap) => {
      const m = caseData.modules[ap.id];
      const saved = (m?.residence?.residence as { notes?: string } | undefined)?.notes?.trim();
      const name = dash((m?.general?.general as Record<string, unknown>)?.borrowerName);
      return { id: ap.id, label: ap.label, name, text: saved ?? "" };
    })
    .filter((e) => e.text.length > 0);

  const employmentEntries = applicants
    .filter((ap) => isModuleApplicable(caseData.modules[ap.id], "employment"))
    .map((ap) => {
      const m = caseData.modules[ap.id];
      const saved = (m?.employment?.employment as { notes?: string } | undefined)?.notes?.trim();
      const name = dash((m?.general?.general as Record<string, unknown>)?.borrowerName);
      return { id: ap.id, label: ap.label, name, text: saved ?? "" };
    })
    .filter((e) => e.text.length > 0);

  const hasAnyContent = residenceEntries.length > 0 || employmentEntries.length > 0;

  return (
    <section className="report-page">
      <PageHeader title="Executive Summary" caseId={caseData.id} />
      <div className="mt-5 space-y-5 text-[13px] leading-6 text-slate-800">
        {residenceEntries.length > 0 && (
          <div className="report-no-break" data-section-start="">
            <h4 className="text-sm font-bold text-slate-900 border-l-4 border-slate-900 pl-2 mb-2 uppercase tracking-wide">
              Applicant and Co-Applicant Residence Verification
            </h4>
            <div className="space-y-3">
              {residenceEntries.map((e) => (
                <div key={e.id} className="report-no-break" data-section-start="">
                  {residenceEntries.length > 1 && (
                    <p className="text-[12px] font-semibold text-slate-700 mb-1">
                      {e.label}
                      {e.name && e.name !== "N/A" ? ` — ${e.name}` : ""}
                    </p>
                  )}
                  <p className="text-justify whitespace-pre-line">{e.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {employmentEntries.map((e) => (
          <div key={`emp-${e.id}`} className="report-no-break" data-section-start="">
            <h4 className="text-sm font-bold text-slate-900 border-l-4 border-slate-900 pl-2 mb-2 uppercase tracking-wide">
              {e.label} Business / Employment Verification
              {e.name && e.name !== "N/A" ? ` — ${e.name}` : ""}
            </h4>
            <p className="text-justify whitespace-pre-line">{e.text}</p>
          </div>
        ))}

        <div className="report-no-break mt-2 rounded-md border border-slate-300 bg-slate-50 p-4" data-section-start="">
          <h4 className="text-sm font-bold text-slate-900 mb-1.5">Overall Assessment</h4>
          <p className="text-justify">{overallAssessment(caseData, applicants)}</p>
        </div>

        {!hasAnyContent && (
          <p className="text-[12px] italic text-slate-500">
            No residence or employment notes have been recorded by the verifier for this case.
          </p>
        )}
      </div>
    </section>
  );
}


function residenceObservation(m: Record<ModuleKey, ModuleData> | undefined, ap: { label: string }) {
  const r = m?.residence?.residence ?? {};
  const name = dash((m?.general?.general as Record<string, unknown>)?.borrowerName);
  if (!m?.residence || m.residence.status === "not_started") {
    return `Residence verification for ${ap.label} (${name}) has not been initiated as of the date of this report.`;
  }
  const parts: string[] = [];
  if (r.addressTallied === "yes") {
    parts.push(`The residential address furnished by ${ap.label} was physically visited and found to be in order, tallying with the address declared in the application.`);
  } else if (r.addressTallied === "no") {
    parts.push(`The address furnished by ${ap.label} did NOT tally with the premises visited by the field executive, which is recorded as an adverse observation.`);
  } else {
    parts.push(`The address furnished by ${ap.label} was visited; however the field executive could not conclusively match it with the application records.`);
  }
  if (r.stayConfirmed === "yes") {
    parts.push(`The applicant's residence at the premises was confirmed${r.stayingSinceYears ? `, with reported continuous stay of ${r.stayingSinceYears} year(s)` : ""}.`);
  } else if (r.stayConfirmed === "no") {
    parts.push(`The applicant's actual residence at the visited premises could not be confirmed${r.reasonNotConfirmed ? ` (${r.reasonNotConfirmed})` : ""}.`);
  }
  if (r.namePlateSeen === "yes") {
    parts.push(`A name-plate ${r.namePlateMatch === "yes" ? "matching the applicant was" : "was"} sighted at the entrance of the premises.`);
  } else if (r.namePlateSeen === "no") {
    parts.push(`No name-plate was sighted at the premises during the visit.`);
  }
  if (r.typeOfResidence || r.livingStandard) {
    parts.push(`The residence is observed to be ${dash(r.typeOfResidence)} with ${dash(r.livingStandard)} standard of living.`);
  }
  if (r.verifierRemarks) parts.push(`Field executive remarks: ${r.verifierRemarks}.`);
  if (r.negativeRemarks) parts.push(`Adverse remarks recorded: ${r.negativeRemarks}.`);
  return parts.join(" ");
}

function employmentObservation(m: Record<ModuleKey, ModuleData> | undefined, ap: { label: string }) {
  const e = m?.employment?.employment ?? {};
  if (!m?.employment || m.employment.status === "not_started") {
    return `Employment / business verification for ${ap.label} has not been initiated as of the date of this report.`;
  }
  const cat = String(e.employmentCategory ?? "");
  const isBiz = cat === "business_owner" || cat === "self_employed";
  const parts: string[] = [];
  if (e.businessName || e.designation) {
    parts.push(
      isBiz
        ? `${ap.label} is engaged as ${dash(titleCase(cat))} with ${dash(e.businessName)}${e.sinceWhen ? ` since ${e.sinceWhen}` : ""}.`
        : `${ap.label} is employed with ${dash(e.businessName)} in the capacity of ${dash(e.designation)}${e.sinceWhen ? ` since ${e.sinceWhen}` : ""}.`,
    );
  }
  if (e.businessAddress) parts.push(`The office / business premises at ${e.businessAddress} were physically visited.`);
  if (e.nameBoardSighted === "yes") parts.push(`The business name-board was clearly sighted at the premises${e.nameBoardComments ? ` (${e.nameBoardComments})` : ""}.`);
  else if (e.nameBoardSighted === "no") parts.push(`No name-board was sighted at the premises, which has been recorded as an adverse observation.`);
  if (Array.isArray(e.proofsReceived) && e.proofsReceived.length) {
    parts.push(`Supporting proofs received during verification: ${(e.proofsReceived as string[]).join(", ")}.`);
  }
  if (e.visitingCardObtained === "yes") parts.push(`A visiting card of the applicant was obtained and retained on record.`);
  if (e.verifierRemarks) parts.push(`Field executive remarks: ${e.verifierRemarks}.`);
  if (parts.length === 0) parts.push(`Employment / business verification for ${ap.label} is recorded; however limited information was furnished during the visit.`);
  return parts.join(" ");
}

function panObservation(m: Record<ModuleKey, ModuleData> | undefined, ap: { label: string }) {
  const p = m?.pan?.pan ?? {};
  if (!m?.pan || m.pan.status === "not_started") {
    return `PAN verification for ${ap.label} has not been initiated as of the date of this report.`;
  }
  const parts: string[] = [];
  if (p.finalStatus === "confirmed") {
    parts.push(`The Permanent Account Number ${dash(p.panNumber)} furnished by ${ap.label} stands CONFIRMED on independent verification through the official income-tax PAN verification utility.`);
  } else if (p.finalStatus === "not_confirmed") {
    parts.push(`The Permanent Account Number ${dash(p.panNumber)} furnished by ${ap.label} could NOT be confirmed through the official income-tax verification utility, which is recorded as an adverse finding.`);
  } else {
    parts.push(`The Permanent Account Number ${dash(p.panNumber)} furnished by ${ap.label} is under final review.`);
  }
  if (p.nameMatching === "yes") parts.push(`Name appearing on PAN tallies with the applicant record.`);
  else if (p.nameMatching === "no") parts.push(`Name appearing on PAN does NOT tally with the applicant record.`);
  if (p.genderMatching === "no") parts.push(`Gender on PAN does NOT tally with the applicant record.`);
  if (p.verifierRemarks) parts.push(`Verifier remarks: ${p.verifierRemarks}.`);
  if (p.negativeRemarks) parts.push(`Adverse remarks: ${p.negativeRemarks}.`);
  return parts.join(" ");
}

function salaryObservation(m: Record<ModuleKey, ModuleData> | undefined, ap: { label: string }) {
  // N/A handling for business owners / self employed
  if (!isModuleApplicable(m, "salary")) {
    return `Salary / Form-16 Verification is not applicable for this applicant. Income proof and business-related supporting documents were verified through the business verification process.`;
  }
  const s = m?.salary?.salary ?? {};
  if (!m?.salary || m.salary.status === "not_started") {
    return `Salary / Form-16 verification for ${ap.label} has not been initiated as of the date of this report.`;
  }
  const parts: string[] = [];
  if (s.serviceConfirmed === "yes") {
    parts.push(`Employment of ${ap.label} with ${dash(s.companyName)} in the capacity of ${dash(s.designation)} for ${dash(s.yearsOfService)} year(s) of service has been independently confirmed.`);
  } else if (s.serviceConfirmed === "no") {
    parts.push(`Employment of ${ap.label} with ${dash(s.companyName)} could NOT be confirmed, which is recorded as an adverse observation.`);
  } else if (s.companyName) {
    parts.push(`${ap.label} has declared employment with ${dash(s.companyName)} as ${dash(s.designation)}; service confirmation is under review.`);
  }
  if (s.grossMonthlyIncome) parts.push(`Gross monthly income reported: ${formatINR(s.grossMonthlyIncome)}.`);
  if (s.totalIncome) parts.push(`Total annual income as per Form-16: ${formatINR(s.totalIncome)}.`);
  if (s.incomeUnderSalaryHeadVerified === "yes") parts.push(`Income under the head 'Salaries' as per Form-16 was verified and found in order.`);
  if (s.taxCalculationVerified === "yes") parts.push(`Tax computation in Form-16 was verified and found arithmetically correct.`);
  if (s.form16TaxPayableCorrect === "no") parts.push(`Tax payable as per Form-16 was found to be inconsistent on verification.`);
  if (s.remarks) parts.push(`Remarks: ${s.remarks}.`);
  if (parts.length === 0) parts.push(`Salary / Form-16 verification for ${ap.label} is recorded; however limited income data was furnished.`);
  return parts.join(" ");
}

function documentsObservation(m: Record<ModuleKey, ModuleData> | undefined, ap: { label: string }) {
  const d = m?.documents?.documents ?? {};
  if (!m?.documents || m.documents.status === "not_started") {
    return `Documents verification for ${ap.label} has not been initiated as of the date of this report.`;
  }
  const map: Array<[string, unknown]> = [
    ["seal of the organisation", d.sealOfOrganization],
    ["signature of the authorised signatory", d.signatureOfAuthority],
    ["date and amount on the salary slip", d.salarySlipDateAmount],
    ["office address on supporting documents", d.officeAddressCorrect],
  ];
  const tallied = map.filter(([, v]) => v === "tallied").map(([k]) => k);
  const notTallied = map.filter(([, v]) => v === "not_tallied").map(([k]) => k);
  const na = map.filter(([, v]) => v === "not_applicable").map(([k]) => k);
  const parts: string[] = [];
  if (tallied.length) parts.push(`The following document attributes tallied and were found in order: ${tallied.join(", ")}.`);
  if (notTallied.length) parts.push(`The following document attributes did NOT tally and are recorded as adverse observations: ${notTallied.join(", ")}.`);
  if (na.length) parts.push(`The following attributes were marked not applicable: ${na.join(", ")}.`);
  if (parts.length === 0) parts.push(`Documents verification for ${ap.label} is recorded; however no specific attribute was conclusively marked.`);
  return parts.join(" ");
}

function businessObservation(m: Record<ModuleKey, ModuleData> | undefined, ap: { label: string }) {
  const b = m?.business?.business ?? {};
  if (!m?.business || m.business.status === "not_started") {
    return `No additional observations have been recorded for ${ap.label} as on the date of this report.`;
  }
  const parts: string[] = [];
  if (b.businessActivitySeen === "yes") parts.push(`Active business / occupational activity was observed at the premises during the visit.`);
  else if (b.businessActivitySeen === "no") parts.push(`No active business / occupational activity was observed at the premises, which is recorded as an adverse observation.`);
  if (b.numberOfEmployees) parts.push(`Number of employees observed on premises: ${b.numberOfEmployees}.`);
  if (b.equipmentStockSeen) parts.push(`Equipment / stock observed: ${b.equipmentStockSeen}.`);
  if (b.businessPremisesCondition) parts.push(`Condition of business premises is rated ${titleCase(String(b.businessPremisesCondition))}.`);
  if (b.levelOfBusinessActivity) parts.push(`Level of business activity is rated ${titleCase(String(b.levelOfBusinessActivity))}.`);
  if (b.verifierRemarks) parts.push(`Verifier remarks: ${b.verifierRemarks}.`);
  if (b.negativeRemarks) parts.push(`Adverse remarks: ${b.negativeRemarks}.`);
  if (parts.length === 0) parts.push(`Other observations for ${ap.label} have been recorded; no specific positive or adverse findings noted.`);
  return parts.join(" ");
}

function overallAssessment(caseData: VerificationCase, applicants: { id: string; label: string }[]): string {
  const op = overallOpinion(caseData);
  return `Based on the field investigation conducted across ${applicants.length} applicant(s) and the documentary evidence submitted in support of loan application ${caseData.id} (${dash(caseData.loanType)}, ${formatINR(caseData.loanAmount)}, ${dash(caseData.branchName)} branch), the overall outcome of the due diligence exercise is assessed as ${op.label}. Particulars supporting this opinion are detailed in the per-applicant verification sections that follow.`;
}


/* ====================== DETAILED PAGES ====================== */

type ApplicantRef = { id: string; label: string; name: string };

const MODULE_ROW_BUILDERS: Record<
  ModuleKey,
  { title: string; rows: (modules: Record<ModuleKey, ModuleData> | undefined) => [string, string][] }
> = {
  general: {
    title: "General Details",
    rows: (m) => generalRows(m?.general?.general),
  },
  residence: {
    title: "Residence Verification",
    rows: (m) => residenceRows(m?.residence?.residence),
  },
  employment: {
    title: "Employment / Business Verification",
    rows: (m) => employmentRows(m?.employment?.employment),
  },
  pan: {
    title: "PAN Verification",
    rows: (m) => panRows(m?.pan?.pan),
  },
  salary: {
    title: "Salary / Form-16 Verification",
    rows: (m) => salaryRows(m?.salary?.salary),
  },
  documents: {
    title: "Document Verification",
    rows: (m) => documentRows(m?.documents?.documents),
  },
  business: {
    title: "Business Activity Verification",
    rows: (m) => businessRows(m?.business?.business),
  },
  property: {
    title: "Property Details Verification",
    rows: (m) => propertyRows(m?.property?.property),
  },
  evidence: { title: "", rows: () => [] },
  feedback: { title: "", rows: () => [] },
};

function ModuleGroupedSections({
  caseData,
  applicants,
}: {
  caseData: VerificationCase;
  applicants: ApplicantRef[];
}) {
  return (
    <>
      {REPORT_MODULES.map((mod) => {
        // Skip module entirely if not applicable for any applicant
        const anyApplicable = applicants.some((ap) =>
          isModuleApplicable(caseData.modules[ap.id], mod.key, caseData.loanType),
        );
        if (!anyApplicable) return null;

        const builder = MODULE_ROW_BUILDERS[mod.key];
        return (
          <section key={mod.key} className="report-page">
            <PageHeader title={builder.title} caseId={caseData.id} />

            {applicants.map((ap, idx) => {
              const modules = caseData.modules[ap.id];
              const applicable = isModuleApplicable(modules, mod.key, caseData.loanType);
              const heading = (
                <h3 className="text-[13px] font-bold text-slate-900 uppercase tracking-wide border-l-4 border-slate-900 pl-2 mb-2">
                  {ap.label}
                  {ap.name && ap.name !== "N/A" ? ` — ${ap.name}` : ""}
                </h3>
              );

              // Keep the module page-header glued to the first applicant subsection.
              const wrapperClass =
                idx === 0 ? "report-no-break mt-5" : "report-no-break mt-6";
              const sectionStart = idx > 0 ? { "data-section-start": "" } : {};

              if (!applicable) {
                return (
                  <div key={ap.id} className={wrapperClass} {...sectionStart}>
                    {heading}
                    <p className="text-[12px] text-slate-600 italic px-1 py-2">
                      N/A — this module is not applicable for {ap.label}.
                    </p>
                  </div>
                );
              }

              return (
                <div key={ap.id} className={wrapperClass} {...sectionStart}>
                  {heading}
                  <NumberedDetailTable rows={builder.rows(modules)} />
                </div>
              );
            })}
          </section>
        );
      })}
    </>
  );
}

// Labels whose values should render in a professional document-style mono font,
// resembling official identification numbers on CA / banking paperwork.
const ID_LABEL_PATTERNS = [
  /pan\s*number/i,
  /aadhaar/i,
  /udin/i,
  /mobile/i,
  /telephone/i,
  /account\s*number/i,
  /ifsc/i,
  /gst/i,
  /registration\s*number/i,
  /verification\s*number/i,
  /\bcin\b/i,
  /\btan\b/i,
];

function isIdLikeLabel(label: string): boolean {
  return ID_LABEL_PATTERNS.some((re) => re.test(label));
}

function NumberedDetailTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full text-[12px] border-collapse">
      <tbody>
        {rows.map(([k, v], i) => {
          const idLike = isIdLikeLabel(k) && v && v !== "N/A";
          return (
            <tr key={k} className={i % 2 === 0 ? "bg-slate-50" : ""}>
              <td className="border border-slate-300 px-2 py-1.5 w-10 text-center font-semibold text-slate-600 align-top">
                {i + 1}.
              </td>
              <td className="border border-slate-300 px-3 py-1.5 w-1/3 font-semibold text-slate-700 align-top">
                {k}
              </td>
              <td
                className={
                  "border border-slate-300 px-3 py-1.5 align-top whitespace-pre-wrap" +
                  (idLike ? " report-id-value" : "")
                }
              >
                {idLike ? v.toUpperCase() : v}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}


function r(label: string, value: unknown): [string, string] {
  return [label, dash(value)];
}

function generalRows(d: Record<string, unknown> | undefined): [string, string][] {
  d = d ?? {};
  return [
    r("Borrower Name", d.borrowerName),
    r("Father / Husband Name", d.fatherHusbandName),
    r("Gender", titleCase(String(d.gender ?? ""))),
    r("Resident Status", titleCase(String(d.residentStatus ?? ""))),
    r("PAN Number", d.panNumber),
    r("Aadhaar Number", d.aadhaarNumber),
    r("Date of Birth", d.dateOfBirth),
    r("Qualification", d.qualification),
    r("Marital Status", titleCase(String(d.maritalStatus ?? ""))),
    r("Employment Type", d.employmentType),
  ];
}

function residenceRows(d: Record<string, unknown> | undefined): [string, string][] {
  d = d ?? {};
  return [
    r("Given Address", d.givenAddress),
    r("Present Address", d.presentAddress),
    r("Address Tallied", titleCase(String(d.addressTallied ?? ""))),
    r("Stay Confirmed", titleCase(String(d.stayConfirmed ?? ""))),
    r("Staying Since (years)", d.stayingSinceYears),
    r("Name-plate Sighted", titleCase(String(d.namePlateSeen ?? ""))),
    r("Name-plate Match", titleCase(String(d.namePlateMatch ?? ""))),
    r("Nature of Residence", d.natureOfResidence),
    r("Type of Residence", d.typeOfResidence),
    r("Type of Locality", d.typeOfLocality),
    r("Living Standard", d.livingStandard),
    r("Number of Dependents", d.numberOfDependents),
    r("Contact Person", d.contactPersonName),
    r("Contact Person Relation", d.contactPersonRelation),
    r("Mobile Number", d.mobileNumber),
    r("Visit Date / Time", d.visitDateTime),
    r("Verifier Remarks", d.verifierRemarks),
    r("Supervisor Remarks", d.supervisorRemarks),
  ];
}

function employmentRows(d: Record<string, unknown> | undefined): [string, string][] {
  d = d ?? {};
  const proofs = Array.isArray(d.proofsReceived) ? (d.proofsReceived as string[]).join(", ") : "";
  return [
    r("Employment Category", titleCase(String(d.employmentCategory ?? ""))),
    r("Business / Employer", d.businessName),
    r("Address", d.businessAddress),
    r("Address Confirmed By", d.addressConfirmedBy),
    r("Landmark", d.landmark),
    r("Office Ownership", d.officeOwnership),
    r("Name-board Sighted", titleCase(String(d.nameBoardSighted ?? ""))),
    r("Name-board Comments", d.nameBoardComments),
    r("Proofs Received", proofs),
    r("Designation", d.designation),
    r("Year of Establishment", d.yearOfEstablishment),
    r("Type of Firm", d.typeOfFirm),
    r("Nature of Business", d.natureOfBusiness),
    r("Website / Email", d.websiteEmail),
    r("Since When", d.sinceWhen),
    r("Line of Business", d.lineOfBusiness),
    r("Telephone", d.telephoneNumber),
    r("Terms of Employment", d.termsOfEmployment),
    r("Supervisor Details", d.supervisorDetails),
    r("Visiting Card Obtained", titleCase(String(d.visitingCardObtained ?? ""))),
    r("Verifier Remarks", d.verifierRemarks),
    r("Supervisor Remarks", d.supervisorRemarks),
  ];
}

function panRows(d: Record<string, unknown> | undefined): [string, string][] {
  d = d ?? {};
  return [
    r("PAN Number", d.panNumber),
    r("Name Matching", titleCase(String(d.nameMatching ?? ""))),
    r("Gender Matching", titleCase(String(d.genderMatching ?? ""))),
    r("PAN Verified (Official Utility)", titleCase(String(d.panVerifiedOfficial ?? ""))),
    r("Final Status", titleCase(String(d.finalStatus ?? ""))),
    r("Verifier Remarks", d.verifierRemarks),
    r("Supervisor Remarks", d.supervisorRemarks),
  ];
}

function salaryRows(d: Record<string, unknown> | undefined): [string, string][] {
  d = d ?? {};
  return [
    r("Company Name", d.companyName),
    r("Designation", d.designation),
    r("Years of Service", d.yearsOfService),
    r("Service Confirmed", titleCase(String(d.serviceConfirmed ?? ""))),
    r("Gross Monthly Income", formatINR(String(d.grossMonthlyIncome ?? ""))),
    r("Total Income", formatINR(String(d.totalIncome ?? ""))),
    r("Income (Salary Head) Verified", titleCase(String(d.incomeUnderSalaryHeadVerified ?? ""))),
    r("Tax Calculation Verified", titleCase(String(d.taxCalculationVerified ?? ""))),
    r("Form-16 Tax Payable Correct", titleCase(String(d.form16TaxPayableCorrect ?? ""))),
    r("Remarks", d.remarks),
  ];
}

function documentRows(d: Record<string, unknown> | undefined): [string, string][] {
  d = d ?? {};
  return [
    r("Seal of Organization", titleCase(String(d.sealOfOrganization ?? ""))),
    r("Signature of Authority", titleCase(String(d.signatureOfAuthority ?? ""))),
    r("Salary Slip Date & Amount", titleCase(String(d.salarySlipDateAmount ?? ""))),
    r("Office Address Correct", titleCase(String(d.officeAddressCorrect ?? ""))),
  ];
}

function businessRows(d: Record<string, unknown> | undefined): [string, string][] {
  d = d ?? {};
  return [
    r("Business Activity Seen", titleCase(String(d.businessActivitySeen ?? ""))),
    r("Number of Employees", d.numberOfEmployees),
    r("Equipment / Stock Seen", d.equipmentStockSeen),
    r("Business Premises", titleCase(String(d.businessPremisesCondition ?? ""))),
    r("Level of Business Activity", titleCase(String(d.levelOfBusinessActivity ?? ""))),
    r("Verifier Remarks", d.verifierRemarks),
    r("Supervisor Remarks", d.supervisorRemarks),
  ];
}

function propertyRows(d: Record<string, unknown> | undefined): [string, string][] {
  d = d ?? {};
  const rows: [string, string][] = [
    r("Address of Property", d.addressOfProperty),
    r("Address Matches Application", titleCase(String(d.addressMatchesApplication ?? ""))),
    r("Name of Owner", d.ownerName),
    r("Type of Property", d.typeOfProperty),
    r("Locality", d.locality),
    r("Ownership", d.ownership),
    r("Type of Construction", d.typeOfConstruction),
    r("Stage of Construction", d.stageOfConstruction),
    r("Independent Access", titleCase(String(d.independentAccess ?? ""))),
    r("Type of Access", d.accessType),
    r("Building Usage Type", d.buildingUsageType),
  ];
  if (String(d.typeOfConstruction ?? "") === "Flat Under Construction") {
    rows.push(
      r("Builder Name", d.builderName),
      r("Builder Reputation", d.builderReputation),
      r("Source of Information", d.builderSource),
      r("Construction Stage", d.builderStage),
      r("Work in Progress", d.workInProgress),
      r("Likely Completion Date", d.likelyCompletionDate),
    );
  }
  rows.push(
    r("Date of Site Visit", d.dateOfSiteVisit),
    r("Verifier Remarks", d.verifierRemarks),
  );
  return rows;
}

/* ====================== CERTIFICATE PAGE ====================== */
function CertificatePage({
  caseData,
  reportInfo,
  signatureDataUrl,
}: {
  caseData: VerificationCase;
  reportInfo: ReportInfo;
  signatureDataUrl: string;
}) {
  return (
    <section className="report-page">
      <PageHeader title="Final Certificate" caseId={caseData.id} />

      <div className="mt-8 text-[13px] leading-7 text-slate-800 text-justify">
        <p>
          This is to certify that we, <strong>{AGENCY.name}</strong>, Chartered Accountants,
          have carried out the due diligence and field verification in respect of loan
          application bearing Verification Number <strong className="font-mono">{reportInfo.verificationNumber}</strong>,
          for the <strong>{dash(caseData.loanType)}</strong> facility of
          <strong> {formatINR(caseData.loanAmount)}</strong> at{" "}
          <strong>{caseData.bankName?.trim() || "Bank of India"}</strong>,{" "}
          <strong>{dash(caseData.branchName)}</strong> branch.
        </p>
        <p className="mt-3">
          The verification has been performed on the basis of physical visits, documentary
          evidence submitted, and discreet third-party enquiries. The observations recorded in
          this report are based on the information available on the date of verification and to
          the best of our knowledge and belief.
        </p>
      </div>

      <div className="report-no-break mt-8 rounded-md border-2 border-slate-900 p-5 text-sm">
        <table className="w-full">
          <tbody>
            <CoverRow label="Place" value="Vijayawada" />
            <CoverRow label="Date of Verification" value={reportInfo.dateOfVerification} />
            <CoverRow label="Date of Report Submission" value={reportInfo.dateOfReportSubmission} />
            <CoverRow label="Verification Number" value={reportInfo.verificationNumber} mono />
            <CoverRow label="UDIN Number" value={reportInfo.udinNumber} mono />
            <CoverRow label="Chartered Accountant" value={reportInfo.caName} />
          </tbody>
        </table>
      </div>

      {/* Spacer to keep signature away from the table */}
      <div className="mt-12 flex justify-end report-no-break">
        <SignatureBlock signatureDataUrl={signatureDataUrl} caName={reportInfo.caName} udin={reportInfo.udinNumber} />
      </div>
    </section>
  );
}



/* ============== BRANCH HEAD CONFIRMATION ============== */
function BranchConfirmationPage({ caseData }: { caseData: VerificationCase }) {
  return (
    <section className="report-page">
      <PageHeader title="Confirmation by Branch Head" caseId={caseData.id} />

      <div className="mt-6 text-[13px] leading-7 text-slate-800 text-justify">
        The Branch Head is requested to record acceptance of the field-verification report
        below for record and onward credit-appraisal processing.
      </div>

      <div className="report-no-break mt-8 border-2 border-slate-900 rounded-md">
        <div className="grid grid-cols-2">
          <div className="p-4 border-r-2 border-slate-900">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
              Decision
            </p>
            <div className="flex items-center gap-6 text-sm">
              <label className="flex items-center gap-2">
                <span className="inline-block h-5 w-5 border-2 border-slate-900" />
                <span className="font-semibold">Accepted</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="inline-block h-5 w-5 border-2 border-slate-900" />
                <span className="font-semibold">Not Accepted</span>
              </label>
            </div>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3">
              Date
            </p>
            <div className="h-7 border-b border-slate-400" />
          </div>
        </div>
        <div className="p-4 border-t-2 border-slate-900">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
            Remarks
          </p>
          <div className="space-y-4">
            <div className="h-6 border-b border-slate-300" />
            <div className="h-6 border-b border-slate-300" />
            <div className="h-6 border-b border-slate-300" />
          </div>
        </div>
        <div className="p-6 border-t-2 border-slate-900">
          <div className="ml-auto w-72 text-center">
            <div className="h-16 border-b-2 border-slate-900" />
            <p className="mt-2 text-sm font-semibold">Branch Manager</p>
            <p className="text-xs text-slate-600">Signature & Seal</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ================ SUPPORTING DOCUMENTS ================ */
function SupportingDocumentsPages({
  caseData,
  applicants,
}: {
  caseData: VerificationCase;
  applicants: { id: string; label: string }[];
}) {
  // Collect non-empty groups across all applicants
  const groups = EVIDENCE_GROUPS.map((g) => {
    const items = applicants.flatMap((ap) => {
      const ev = caseData.modules[ap.id]?.evidence?.evidence as
        | Record<string, EvidenceFile[]>
        | undefined;
      const list = ev?.[g.key] ?? [];
      return list.map((f) => ({ ...f, owner: ap.label }));
    });
    return { ...g, items };
  }).filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <section className="report-page">
        <PageHeader title="Supporting Documents & Evidence" caseId={caseData.id} />
        <div className="mt-10 text-center text-sm text-slate-500 italic">
          No supporting evidence has been uploaded for this case.
        </div>
      </section>
    );
  }

  // Each image / document category is rendered on its own A4 page so categories
  // never bleed into one another (e.g. Applicant Photos vs Residence Photos).
  return (
    <>
      {groups.map((g) => (
        <section key={g.key} className="report-page">
          <PageHeader title={`Supporting Documents — ${g.label}`} caseId={caseData.id} />
          <div className="mt-5">
            <h4 className="text-sm font-bold text-white bg-slate-900 px-3 py-1.5 mb-3 report-keep-with-next">
              {g.label}{" "}
              <span className="font-normal opacity-80">· {g.items.length} file(s)</span>
            </h4>
            <div className="grid grid-cols-1 gap-5">
              {g.items.map((f) => {
                const isImg = f.type.startsWith("image/");
                return (
                  <figure
                    key={f.id}
                    data-section-start=""
                    className="report-no-break rounded-md border border-slate-300 overflow-hidden bg-white flex flex-col"
                  >
                    <div className="report-image-frame bg-slate-50 flex items-start justify-center overflow-hidden">
                      {isImg ? (
                        <img
                          src={f.dataUrl}
                          alt={f.name}
                          className="report-image"
                          loading="eager"
                        />
                      ) : (
                        <div className="text-xs text-slate-500 px-3 py-6 text-center">
                          <p className="font-semibold">{f.type || "Document"}</p>
                          <p className="mt-1 break-all">{f.name}</p>
                        </div>
                      )}
                    </div>
                    <figcaption className="px-3 py-2 text-[11px] text-slate-600 border-t border-slate-200 flex items-center justify-between gap-2">
                      <span className="truncate font-medium" title={f.name}>
                        {f.name}
                      </span>
                      <span className="shrink-0 text-slate-500">{f.owner}</span>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
        </section>
      ))}
    </>
  );
}

/* ====================== HEADER ====================== */
function PageHeader({ title, caseId }: { title: string; caseId?: string }) {
  return (
    <header className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
      <div>
        <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
          {AGENCY.name} · {AGENCY.subtitle}
        </p>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      </div>
      {caseId ? (
        <div className="text-right text-[11px] text-slate-600">
          <p className="font-semibold">Verification No.</p>
          <p className="font-mono">{caseId}</p>
        </div>
      ) : null}
    </header>
  );
}
