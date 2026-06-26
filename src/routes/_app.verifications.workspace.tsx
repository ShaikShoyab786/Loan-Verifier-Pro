import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Save,
  FileDown,
  UserPlus,
  User,
  Users,
  ChevronRight,
  Home,
  Briefcase,
  IdCard,
  Receipt,
  FolderCheck,
  Building2,
  Landmark,
  ImageUp,
  ClipboardList,
  ClipboardCheck,
  CircleDashed,
  CircleDot,
  CheckCircle2,
  Trash2,
  PartyPopper,
  FileText,
  Pencil,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { toast } from "sonner";
import {
  CASE_STATUS_META,
  MODULE_KEYS,
  isCaseLocked,
  isModuleApplicable,
  isModuleVisible,
  isPropertyLoanType,
  labelApplicants,
  useVerificationStore,
  type ModuleKey,
  type ModuleStatus,
} from "@/lib/verification-store";
import { Lock } from "lucide-react";


export const Route = createFileRoute("/_app/verifications/workspace")({
  head: () => ({ meta: [{ title: "Verification Workspace — VerifyPro" }] }),
  component: WorkspacePage,
});


const modules: { key: ModuleKey; label: string; icon: typeof Home; desc: string; to?: string }[] = [
  { key: "general", label: "General Details", icon: ClipboardList, desc: "Basic case & applicant overview", to: "/verifications/general" },
  { key: "residence", label: "Residence Verification", icon: Home, desc: "Address & residence proofs", to: "/verifications/residence" },
  { key: "employment", label: "Employment Verification", icon: Briefcase, desc: "Employer & tenure checks", to: "/verifications/employment" },
  { key: "pan", label: "PAN Verification", icon: IdCard, desc: "PAN authenticity & match", to: "/verifications/pan" },
  { key: "salary", label: "Salary / Form-16 Verification", icon: Receipt, desc: "Income proofs & payslips", to: "/verifications/salary" },
  { key: "documents", label: "Documents Verification", icon: FolderCheck, desc: "KYC & supporting documents", to: "/verifications/documents" },
  { key: "business", label: "Business Activity Verification", icon: Building2, desc: "Business premises & activity", to: "/verifications/business" },
  { key: "property", label: "Property Details Verification", icon: Landmark, desc: "Collateral property & site visit", to: "/verifications/property" },
  { key: "evidence", label: "Evidence Upload", icon: ImageUp, desc: "Photos, geo-tags & attachments", to: "/verifications/evidence" },
  { key: "feedback", label: "Final Feedback", icon: ClipboardCheck, desc: "Final verification outcome per person", to: "/verifications/feedback" },
];

function statusBadge(status: ModuleStatus, applicable: boolean) {
  if (!applicable)
    return <Badge variant="secondary" className="text-[10px] bg-slate-200 text-slate-600 hover:bg-slate-200">N/A</Badge>;
  if (status === "completed")
    return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px]">Completed</Badge>;
  if (status === "in_progress")
    return <Badge className="bg-amber-500 hover:bg-amber-500 text-white text-[10px]">In Progress</Badge>;
  return <Badge variant="secondary" className="text-[10px]">Not Started</Badge>;
}

function rightStatusBadge(status: ModuleStatus, applicable: boolean) {
  if (!applicable)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
        <CircleDashed className="h-3.5 w-3.5" /> N/A
      </span>
    );
  if (status === "completed")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" /> Completed
      </span>
    );
  if (status === "in_progress")
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600">
        <CircleDot className="h-3.5 w-3.5" /> In Progress
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
      <CircleDashed className="h-3.5 w-3.5" /> Pending
    </span>
  );
}


function formatINR(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return "₹ " + new Intl.NumberFormat("en-IN").format(n);
}

function WorkspacePage() {
  const navigate = useNavigate();
  const activeCaseId = useVerificationStore((s) => s.activeCaseId);
  const activeCase = useVerificationStore((s) =>
    s.activeCaseId ? s.cases[s.activeCaseId] : null,
  );
  const applicants = useVerificationStore((s) => s.applicants);
  const activeId = useVerificationStore((s) => s.activeApplicantId);
  const setActive = useVerificationStore((s) => s.setActive);
  const addCoApplicant = useVerificationStore((s) => s.addCoApplicant);
  const removeApplicant = useVerificationStore((s) => s.removeApplicant);
  const moduleState = useVerificationStore((s) => s.modules[activeId]);
  const saveDraftActiveCase = useVerificationStore((s) => s.saveDraftActiveCase);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Wait for cloud sync to hydrate the store before deciding whether to redirect.
  const hydrated = useVerificationStore((s) => s.isHydrated);

  useEffect(() => {
    if (hydrated && !activeCaseId) {
      console.log("[activeCaseId] workspace:no-active-after-hydrate → /drafts");
      navigate({ to: "/verifications/drafts" });
    }
  }, [hydrated, activeCaseId, navigate]);

  if (!activeCase) return null;

  const primaryApplicantId = activeCase.applicants.find((a) => a.isPrimary)?.id ?? "primary";
  const primaryGeneral = (activeCase.modules[primaryApplicantId]?.general as unknown as { general?: { borrowerName?: string } })?.general;
  const borrowerName = primaryGeneral?.borrowerName?.trim() ?? "";

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    removeApplicant(pendingDeleteId);
    setPendingDeleteId(null);
  };

  const labeled = labelApplicants(applicants);
  const activeLabel = labeled.find((a) => a.id === activeId)?.label ?? "Applicant";

  const loanType = activeCase.loanType;
  const visibleModules = modules.filter(
    (m) => isModuleVisible(moduleState, m.key) && (m.key !== "property" || isPropertyLoanType(loanType)),
  );
  const applicableKeys = MODULE_KEYS.filter((k) => isModuleApplicable(moduleState, k, loanType));
  const completedCount = applicableKeys.filter(
    (k) => moduleState?.[k]?.status === "completed",
  ).length;
  const overallPct = applicableKeys.length
    ? Math.round((completedCount / applicableKeys.length) * 100)
    : 0;


  const statusMeta = CASE_STATUS_META[activeCase.status];
  const isLocked = isCaseLocked(activeCase.status);
  const createdLabel = new Date(activeCase.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handleSaveDraft = () => {
    saveDraftActiveCase();
    toast.success("Draft saved", { description: `Case ${activeCase.id} kept as Draft.` });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/verifications/drafts" className="hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Drafts
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        {borrowerName && (
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">Applicant</p>
              <p className="text-lg font-semibold leading-tight">{borrowerName}</p>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-5 flex-1">
            <Meta label="Verification ID" value={activeCase.id} mono />
            <Meta label="Loan Type" value={activeCase.loanType || "—"} />
            <Meta label="Branch Name" value={activeCase.branchName || "—"} />
            <Meta label="Loan Amount" value={formatINR(activeCase.loanAmount)} />
            <Meta label="Created" value={createdLabel} />
          </div>
          <div className="flex flex-col gap-2 lg:items-end">
            <span className={`text-[11px] font-medium px-2 py-1 rounded-md self-start lg:self-end ${statusMeta.className}`}>
              {statusMeta.label}
            </span>
            <div className="flex gap-2 lg:justify-end">
              {!isLocked && (
                <Button variant="outline" className="h-10" onClick={handleSaveDraft}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
              )}
              <Button className="h-10" asChild>
                <Link to="/verifications/report">
                  <FileDown className="h-4 w-4 mr-2" />
                  {isLocked ? "View Report" : "Generate Report"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-600">
              <Lock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {activeCase.status === "approved"
                  ? "This case has been approved and is locked"
                  : "This case is awaiting manager approval and is locked"}
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Editing is disabled while the case is under review. You can still open the report to
                preview it.
              </p>
            </div>
          </div>
        </div>
      )}

      {overallPct === 100 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white shrink-0">
              <PartyPopper className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
                Verification Process Completed Successfully
              </h3>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                All applicable verification modules have been completed for {activeLabel}.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2 sm:justify-end">
              <Button variant="outline" className="h-10 w-full sm:w-auto sm:h-9 justify-center" asChild>
                <Link to="/dashboard"><LayoutDashboard className="h-4 w-4 mr-2" />Dashboard</Link>
              </Button>
              <Button variant="outline" className="h-10 w-full sm:w-auto sm:h-9 justify-center" asChild>
                <Link to="/verifications/general"><Pencil className="h-4 w-4 mr-2" />Edit Verification</Link>
              </Button>
              <Button className="h-10 w-full sm:w-auto sm:h-9 justify-center bg-emerald-600 hover:bg-emerald-700" asChild>
                <Link to="/verifications/report"><FileText className="h-4 w-4 mr-2" />Preview Report</Link>
              </Button>

            </div>
          </div>
        </div>
      )}


      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* LEFT */}
        <aside className="rounded-2xl border border-border bg-card p-4 h-fit">
          <div className="flex items-center justify-between px-1 pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Applicants</h3>
            </div>
            <Badge variant="secondary" className="text-[10px]">{applicants.length}</Badge>
          </div>
          <div className="space-y-1">
            {labeled.map((a) => {
              const active = a.id === activeId;
              const mods = useVerificationStore.getState().modules[a.id];
              const appKeys = MODULE_KEYS.filter((k) => isModuleApplicable(mods, k, loanType));
              const done = appKeys.filter((k) => mods?.[k]?.status === "completed").length;
              return (
                <div
                  key={a.id}
                  className={`group/item w-full flex items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${
                    active ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-foreground"
                  }`}
                >
                  <button onClick={() => setActive(a.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className={`grid h-7 w-7 place-items-center rounded-full shrink-0 ${active ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"}`}>
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{a.label}</p>
                      <p className={`text-[10px] truncate ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {done} / {appKeys.length} sections
                      </p>
                    </div>
                  </button>

                  {a.isPrimary ? (
                    <ChevronRight className="h-3.5 w-3.5 opacity-70 shrink-0 mr-1" />
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPendingDeleteId(a.id); }}
                      aria-label={`Remove ${a.label}`}
                      className={`grid place-items-center h-7 w-7 rounded-md shrink-0 transition-colors ${active ? "hover:bg-primary-foreground/20" : "hover:bg-destructive/10 hover:text-destructive text-muted-foreground"}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <Button variant="outline" className="w-full mt-3 h-9 text-xs" onClick={addCoApplicant}>
            <UserPlus className="h-3.5 w-3.5 mr-2" />
            Add Co-Applicant
          </Button>
        </aside>

        {/* CENTER */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold">Verification Sections</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Showing modules for <span className="font-medium text-foreground">{activeLabel}</span>
              </p>
            </div>
            <Badge variant="outline" className="text-[10px]">{completedCount} of {applicableKeys.length} complete</Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {visibleModules.map((m) => {
              const Icon = m.icon;
              const applicable = isModuleApplicable(moduleState, m.key, loanType);
              const status = (moduleState?.[m.key]?.status ?? "not_started") as ModuleStatus;
              const pct = !applicable ? 0 : status === "completed" ? 100 : status === "in_progress" ? 50 : 0;
              const card = (
                <div className={`group rounded-xl border border-border bg-background p-4 transition-all h-full ${applicable ? "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5 cursor-pointer" : "opacity-70"}`}>
                  <div className="flex items-start gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-lg shrink-0 transition-colors ${applicable ? "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-tight truncate">{m.label}</p>
                        {statusBadge(status, applicable)}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                        {applicable ? m.desc : "Not applicable for this applicant"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                      <span>Progress</span>
                      <span className="font-medium text-foreground">{applicable ? `${pct}%` : "N/A"}</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </div>
                </div>
              );
              return m.to && applicable ? (
                <Link key={m.key} to={m.to}>
                  {card}
                </Link>
              ) : (
                <div key={m.key}>{card}</div>
              );
            })}
          </div>

        </section>

        {/* RIGHT */}
        <aside className="rounded-2xl border border-border bg-card p-5 h-fit">
          <h3 className="text-sm font-semibold">Verification Progress</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Overall completion</p>

          <div className="mt-4 rounded-xl bg-muted/50 p-4">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Overall</span>
              <span className="text-2xl font-semibold tabular-nums">{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-2 mt-2" />
            <p className="text-[10px] text-muted-foreground mt-2">
              {completedCount} of {applicableKeys.length} sections completed
            </p>
          </div>

          <div className="mt-5 space-y-2">
            {visibleModules.map((m) => {
              const applicable = isModuleApplicable(moduleState, m.key, loanType);
              const status = (moduleState?.[m.key]?.status ?? "not_started") as ModuleStatus;
              return (
                <div key={m.key} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-muted/60 transition-colors">
                  <span className={`text-xs truncate ${!applicable ? "text-muted-foreground" : ""}`}>{m.label}</span>
                  {rightStatusBadge(status, applicable)}
                </div>
              );
            })}
          </div>

        </aside>
      </div>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove co-applicant?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this co-applicant? All associated verification data will be permanently removed from this case.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
      <p className={`text-sm font-semibold mt-1 truncate ${mono ? "font-mono text-[13px]" : ""}`}>{value}</p>
    </div>
  );
}
