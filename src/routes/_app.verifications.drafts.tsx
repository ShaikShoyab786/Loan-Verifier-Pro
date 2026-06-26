import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { FilePlus2, FileClock, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useEffect, useMemo, useState } from "react";
import {
  CASE_STATUS_META,
  useVerificationStore,
  type VerificationCase,
} from "@/lib/verification-store";

export const Route = createFileRoute("/_app/verifications/drafts")({
  head: () => ({ meta: [{ title: "Draft Verifications — VerifyPro" }] }),
  component: DraftsPage,
  errorComponent: ({ error }) => (
    <div className="max-w-[1400px] mx-auto rounded-2xl border border-border bg-card p-10 text-center">
      <h2 className="text-base font-semibold">Something went wrong loading drafts</h2>
      <p className="text-sm text-muted-foreground mt-1">{String(error?.message ?? error)}</p>
      <Link to="/verifications/new" className="inline-block mt-4">
        <Button>
          <FilePlus2 className="h-4 w-4 mr-2" />
          Create New Verification
        </Button>
      </Link>
    </div>
  ),
});

function formatINR(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "—";
  return "₹ " + new Intl.NumberFormat("en-IN").format(n);
}

function getBorrowerName(c: VerificationCase): string {
  const primaryId = c.applicants.find((a) => a.isPrimary)?.id ?? "primary";
  const g = (c.modules[primaryId]?.general as unknown as { general?: { borrowerName?: string } })?.general;
  return g?.borrowerName?.trim() ?? "";
}

function DraftsPage() {
  const navigate = useNavigate();
  const casesMap = useVerificationStore((s) => s.cases);
  const caseOrder = useVerificationStore((s) => s.caseOrder);
  const loadCase = useVerificationStore((s) => s.loadCase);
  const deleteCase = useVerificationStore((s) => s.deleteCase);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const drafts = useMemo<VerificationCase[]>(() => {
    return caseOrder
      .map((id) => casesMap[id])
      .filter((c): c is VerificationCase => !!c && (c.status === "draft" || c.status === "in_progress"));
  }, [casesMap, caseOrder]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const handleOpen = (id: string) => {
    loadCase(id);
    navigate({ to: "/verifications/workspace" });
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Draft Verifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Continue any case you've started but not yet submitted.
          </p>
        </div>
        <Link to="/verifications/new">
          <Button className="h-10">
            <FilePlus2 className="h-4 w-4 mr-2" />
            New Verification
          </Button>
        </Link>
      </div>

      {!hydrated ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          Loading drafts…
        </div>
      ) : drafts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted">
            <FileClock className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-base font-semibold">No Draft Verifications Found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Start a new verification to create your first case.
          </p>
          <Link to="/verifications/new" className="inline-block mt-4">
            <Button>
              <FilePlus2 className="h-4 w-4 mr-2" />
              Create New Verification
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1.2fr_1fr_1.2fr_0.9fr_0.9fr_0.8fr_auto] gap-3 px-5 py-3 border-b border-border bg-muted/40 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>Verification ID</span>
            <span>Loan Type</span>
            <span>Branch</span>
            <span>Amount</span>
            <span>Created</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-border">
            {drafts.map((c) => {
              const meta = CASE_STATUS_META[c.status];
              const created = new Date(c.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
              return (
                <div key={c.id}>
                  {/* Desktop row */}
                  <div className="hidden sm:grid grid-cols-[1.2fr_1fr_1.2fr_0.9fr_0.9fr_0.8fr_auto] gap-3 px-5 py-3 items-center hover:bg-muted/40 transition-colors">
                    <button
                      onClick={() => handleOpen(c.id)}
                      className="text-left truncate min-w-0"
                    >
                      {getBorrowerName(c) ? (
                        <>
                          <span className="block text-sm font-semibold text-foreground truncate">{getBorrowerName(c)}</span>
                          <span className="block font-mono text-[10px] font-medium text-primary truncate">{c.id}</span>
                        </>
                      ) : (
                        <span className="font-mono text-xs font-semibold text-primary hover:underline truncate">{c.id}</span>
                      )}
                    </button>
                    <span className="text-sm truncate">{c.loanType || "—"}</span>
                    <span className="text-sm truncate">{c.branchName || "—"}</span>
                    <span className="text-sm tabular-nums">{formatINR(c.loanAmount)}</span>
                    <span className="text-xs text-muted-foreground">{created}</span>
                    <span className={`text-[11px] font-medium px-2 py-1 rounded-md w-fit ${meta.className}`}>
                      {meta.label}
                    </span>
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => handleOpen(c.id)} className="h-8">
                        Open
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setPendingDelete(c.id)}
                        aria-label="Delete case"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Mobile card */}
                  <div className="sm:hidden px-4 py-4 space-y-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => handleOpen(c.id)}
                        className="text-left min-w-0 flex-1"
                      >
                        {getBorrowerName(c) ? (
                          <>
                            <span className="block text-sm font-semibold text-foreground">{getBorrowerName(c)}</span>
                            <span className="block font-mono text-[11px] font-medium text-primary mt-0.5 break-all">{c.id}</span>
                          </>
                        ) : (
                          <span className="font-mono text-sm font-semibold text-primary break-all">{c.id}</span>
                        )}
                      </button>
                      <span className={`shrink-0 text-[11px] font-medium px-2 py-1 rounded-md w-fit ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Loan Type</span>
                        <span className="block text-sm truncate">{c.loanType || "—"}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Branch</span>
                        <span className="block text-sm truncate">{c.branchName || "—"}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Amount</span>
                        <span className="block text-sm tabular-nums">{formatINR(c.loanAmount)}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Created</span>
                        <span className="block text-sm">{created}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button size="sm" onClick={() => handleOpen(c.id)} className="h-9 flex-1">
                        Open
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setPendingDelete(c.id)}
                        aria-label="Delete case"
                        className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this verification?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the case and all its module data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDelete) deleteCase(pendingDelete);
                setPendingDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
