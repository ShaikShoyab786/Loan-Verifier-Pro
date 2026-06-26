import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  FileCheck2,
  FilePlus2,
  Clock,
  CheckCircle2,
  ArrowRight,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useVerificationStore,
  type VerificationCase,
} from "@/lib/verification-store";

export const Route = createFileRoute("/_app/verifications/completed")({
  head: () => ({ meta: [{ title: "Completed Verifications — VerifyPro" }] }),
  component: CompletedPage,
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

function CompletedPage() {
  const navigate = useNavigate();
  const casesMap = useVerificationStore((s) => s.cases);
  const caseOrder = useVerificationStore((s) => s.caseOrder);
  const loadCase = useVerificationStore((s) => s.loadCase);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const approved = useMemo<VerificationCase[]>(
    () =>
      caseOrder
        .map((id) => casesMap[id])
        .filter((c): c is VerificationCase => !!c && c.status === "approved"),
    [casesMap, caseOrder],
  );
  const pending = useMemo<VerificationCase[]>(
    () =>
      caseOrder
        .map((id) => casesMap[id])
        .filter((c): c is VerificationCase => !!c && c.status === "submitted"),
    [casesMap, caseOrder],
  );

  const openReport = (id: string) => {
    loadCase(id);
    navigate({ to: "/verifications/report" });
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Completed Verifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Approved cases ready to download, plus cases awaiting manager approval.
          </p>
        </div>
        <Link to="/verifications/new">
          <Button className="h-10">
            <FilePlus2 className="h-4 w-4 mr-2" />
            New Verification
          </Button>
        </Link>
      </div>

      {/* Pending approval */}
      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            <div>
              <h2 className="text-base font-semibold">Awaiting Approval</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Submitted to your manager — download unlocks once approved
              </p>
            </div>
          </div>
          {pending.length > 0 && (
            <span className="text-[11px] font-medium px-2 py-1 rounded-md bg-amber-100 text-amber-700">
              {pending.length} pending
            </span>
          )}
        </div>
        {!hydrated ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : pending.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No cases are waiting for approval.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {pending.map((c) => (
              <CaseRow key={c.id} c={c} onOpen={openReport} actionLabel="Preview" />
            ))}
          </div>
        )}
      </section>

      {/* Approved */}
      <section className="rounded-2xl border border-border bg-card">
        <div className="flex items-center gap-2 p-5 border-b border-border">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <div>
            <h2 className="text-base font-semibold">Approved &amp; Downloadable</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Final reports you can open and download
            </p>
          </div>
        </div>
        {!hydrated ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : approved.length === 0 ? (
          <div className="p-10 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted">
              <FileCheck2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-base font-semibold">No Approved Cases Yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Once a manager approves a submitted case, it will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {approved.map((c) => (
              <CaseRow key={c.id} c={c} onOpen={openReport} actionLabel="Open & Download" downloadable />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CaseRow({
  c,
  onOpen,
  actionLabel,
  downloadable,
}: {
  c: VerificationCase;
  onOpen: (id: string) => void;
  actionLabel: string;
  downloadable?: boolean;
}) {
  const name = getBorrowerName(c);
  const reviewed = c.reviewedAt
    ? new Date(c.reviewedAt).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[1.4fr_1fr_1fr_auto] items-center gap-3 sm:gap-4 p-4 sm:px-5">
      <button onClick={() => onOpen(c.id)} className="text-left min-w-0">
        {name ? (
          <>
            <span className="block text-sm font-semibold truncate">{name}</span>
            <span className="block font-mono text-[11px] font-medium text-primary truncate">{c.id}</span>
          </>
        ) : (
          <span className="font-mono text-sm font-semibold text-primary truncate">{c.id}</span>
        )}
      </button>
      <span className="hidden sm:block text-sm truncate">{c.loanType || "—"}</span>
      <span className="hidden sm:block text-sm tabular-nums">
        {formatINR(c.loanAmount)}
        {reviewed && <span className="block text-[11px] text-muted-foreground">Approved {reviewed}</span>}
      </span>
      <Button size="sm" className="h-8" onClick={() => onOpen(c.id)}>
        {downloadable ? <Download className="h-3.5 w-3.5 mr-1.5" /> : null}
        {actionLabel}
        {!downloadable && <ArrowRight className="h-3.5 w-3.5 ml-1.5" />}
      </Button>
    </div>
  );
}
