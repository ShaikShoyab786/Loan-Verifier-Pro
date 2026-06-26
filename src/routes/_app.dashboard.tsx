import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  FilePlus2,
  FileClock,
  FileCheck2,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Layers,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { listReviewCases } from "@/lib/cases.functions";
import {
  CASE_STATUS_META,
  useVerificationStore,
  type VerificationCase,
} from "@/lib/verification-store";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — VerifyPro" }],
  }),
  component: DashboardPage,
});

const toneMap: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  amber: "bg-amber-100 text-amber-700",
  emerald: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
  indigo: "bg-indigo-100 text-indigo-700",
};

function DashboardPage() {
  const { isManager } = Route.useRouteContext();
  return isManager ? <ManagerDashboard /> : <ExecutiveDashboard />;
}

/* ============================ EXECUTIVE ============================ */

function ExecutiveDashboard() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const firstName =
    ((user.user_metadata?.full_name as string | undefined)?.split(/\s+/)[0]) ||
    user.email?.split("@")[0] ||
    "there";
  const casesMap = useVerificationStore((s) => s.cases);
  const caseOrder = useVerificationStore((s) => s.caseOrder);
  const cases = useMemo<VerificationCase[]>(
    () => caseOrder.map((id) => casesMap[id]).filter((c): c is VerificationCase => !!c),
    [casesMap, caseOrder],
  );
  const loadCase = useVerificationStore((s) => s.loadCase);

  const draftCount = cases.filter((c) => c.status === "draft").length;
  const inProgressCount = cases.filter((c) => c.status === "in_progress").length;
  const pendingCount = cases.filter((c) => c.status === "submitted").length;
  const approvedCount = cases.filter((c) => c.status === "approved").length;
  const rejectedCount = cases.filter((c) => c.status === "rejected").length;

  const stats = [
    {
      to: "/verifications/new",
      label: "New Verification",
      value: "Start",
      sub: "Create a fresh case",
      icon: FilePlus2,
      tone: "primary" as const,
    },
    {
      to: "/verifications/drafts",
      label: "Draft Verifications",
      value: String(draftCount + inProgressCount),
      sub: `${draftCount} draft · ${inProgressCount} in progress`,
      icon: FileClock,
      tone: "amber" as const,
    },
    {
      to: "/verifications/completed",
      label: "Pending Approval",
      value: String(pendingCount),
      sub: "Awaiting manager review",
      icon: AlertCircle,
      tone: "rose" as const,
    },
    {
      to: "/verifications/drafts",
      label: "Needs Changes",
      value: String(rejectedCount),
      sub: "Returned by manager",
      icon: XCircle,
      tone: "indigo" as const,
    },
    {
      to: "/verifications/completed",
      label: "Completed",
      value: String(approvedCount),
      sub: "Approved & downloadable",
      icon: FileCheck2,
      tone: "emerald" as const,
    },
  ];

  const recent = cases.slice(0, 5);

  const handleOpen = (id: string) => {
    loadCase(id);
    navigate({ to: "/verifications/workspace" });
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Welcome back, {firstName}</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">Verification Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your active cases, drafts and field visits.
          </p>
        </div>
        <Link to="/verifications/new">
          <Button className="h-10 shrink-0">
            <FilePlus2 className="h-4 w-4 mr-2" />
            New Verification
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.label}
              to={s.to}
              className="group rounded-2xl border border-border bg-card p-5 hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${toneMap[s.tone]}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight">{s.value}</p>
              <p className="text-sm font-medium mt-0.5">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h2 className="text-base font-semibold">Recent Cases</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Latest verifications you've handled</p>
            </div>
            <Link to="/verifications/drafts" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No verifications yet.</p>
              <Link to="/verifications/new" className="inline-block mt-3">
                <Button size="sm">
                  <FilePlus2 className="h-4 w-4 mr-2" />
                  Create your first case
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recent.map((r) => {
                const meta = CASE_STATUS_META[r.status];
                return (
                  <button
                    key={r.id}
                    onClick={() => handleOpen(r.id)}
                    className="w-full grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[1fr_1fr_auto] items-center gap-4 p-4 sm:px-5 text-left hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate font-mono">{r.id}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.loanType || "—"}
                      </p>
                    </div>
                    <p className="hidden sm:block text-xs text-muted-foreground truncate">
                      {r.branchName || "—"}
                    </p>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[11px] font-medium px-2 py-1 rounded-md ${meta.className}`}>
                        {meta.label}
                      </span>
                      <span className="hidden md:inline text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <h3 className="text-sm font-semibold">Cases Overview</h3>
            </div>
            <p className="mt-4 text-3xl font-semibold">{cases.length}</p>
            <p className="text-xs text-muted-foreground">Total verifications created</p>
            <div className="mt-4 space-y-1.5 text-xs">
              <Row label="Draft" value={draftCount} />
              <Row label="In Progress" value={inProgressCount} />
              <Row label="Pending Approval" value={pendingCount} />
              <Row label="Needs Changes" value={rejectedCount} />
              <Row label="Completed" value={approvedCount} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ MANAGER ============================ */

function ManagerDashboard() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const firstName =
    ((user.user_metadata?.full_name as string | undefined)?.split(/\s+/)[0]) ||
    user.email?.split("@")[0] ||
    "there";

  const listFn = useServerFn(listReviewCases);
  const loadExternalCase = useVerificationStore((s) => s.loadExternalCase);

  const query = useQuery({
    queryKey: ["review-cases"],
    queryFn: () => listFn(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const cases = useMemo<VerificationCase[]>(() => {
    const data = query.data;
    if (!data) return [];
    return data.caseOrder
      .map((id) => data.cases[id])
      .filter((c): c is VerificationCase => !!c);
  }, [query.data]);

  const pending = cases.filter((c) => c.status === "submitted");
  const approved = cases.filter((c) => c.status === "approved");
  const rejected = cases.filter((c) => c.status === "rejected");

  const [filter, setFilter] = useState<ManagerFilter>("pending");

  const stats: { key: ManagerFilter; label: string; value: number; sub: string; icon: typeof ClipboardList; tone: keyof typeof toneMap }[] = [
    {
      key: "pending",
      label: "Pending Review",
      value: pending.length,
      sub: "Awaiting your decision",
      icon: ClipboardList,
      tone: "rose",
    },
    {
      key: "approved",
      label: "Approved",
      value: approved.length,
      sub: "Cleared for download",
      icon: CheckCircle2,
      tone: "emerald",
    },
    {
      key: "rejected",
      label: "Rejected",
      value: rejected.length,
      sub: "Returned for changes",
      icon: XCircle,
      tone: "amber",
    },
    {
      key: "all",
      label: "Total Cases",
      value: cases.length,
      sub: "In review pipeline",
      icon: Layers,
      tone: "primary",
    },
  ];

  const handleReviewOpen = (c: VerificationCase) => {
    loadExternalCase(c);
    navigate({ to: "/verifications/report" });
  };

  const viewMeta: Record<ManagerFilter, { list: VerificationCase[]; title: string; subtitle: string; empty: string; accent: "rose" | "muted" }> = {
    pending: {
      list: pending,
      title: "Pending Approval",
      subtitle: "These cases are waiting for your review",
      empty: "No cases waiting for approval. You're all caught up.",
      accent: "rose",
    },
    approved: {
      list: approved,
      title: "Approved Cases",
      subtitle: "Cases you have cleared for download",
      empty: "No approved cases yet.",
      accent: "muted",
    },
    rejected: {
      list: rejected,
      title: "Rejected Cases",
      subtitle: "Cases you returned to the executive for changes",
      empty: "No rejected cases.",
      accent: "muted",
    },
    all: {
      list: cases,
      title: "All Cases",
      subtitle: "Every case in your review pipeline",
      empty: "No cases in the pipeline yet.",
      accent: "muted",
    },
  };
  const view = viewMeta[filter];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">Welcome back, {firstName}</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">Approvals Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review submitted verifications, then approve or return them to the field executive.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          const selected = filter === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setFilter(s.key)}
              aria-pressed={selected}
              className={`text-left rounded-2xl border bg-card p-5 transition-all hover:shadow-md ${
                selected ? "border-primary ring-1 ring-primary/30 shadow-sm" : "border-border hover:border-primary/30"
              }`}
            >
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${toneMap[s.tone]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-2xl font-semibold tracking-tight">
                {query.isLoading ? "—" : s.value}
              </p>
              <p className="text-sm font-medium mt-0.5">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </button>
          );
        })}
      </div>

      <ReviewQueue
        title={view.title}
        subtitle={view.subtitle}
        cases={view.list}
        isLoading={query.isLoading}
        isError={query.isError}
        emptyText={view.empty}
        onOpen={handleReviewOpen}
        accent={view.accent}
      />
    </div>
  );
}

type ManagerFilter = "pending" | "approved" | "rejected" | "all";

function ReviewQueue({
  title,
  subtitle,
  cases,
  isLoading,
  isError,
  emptyText,
  onOpen,
  accent,
}: {
  title: string;
  subtitle: string;
  cases: VerificationCase[];
  isLoading: boolean;
  isError: boolean;
  emptyText: string;
  onOpen: (c: VerificationCase) => void;
  accent: "rose" | "muted";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        {accent === "rose" && cases.length > 0 && (
          <span className="text-[11px] font-medium px-2 py-1 rounded-md bg-rose-100 text-rose-700">
            {cases.length} pending
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Loading cases…</div>
      ) : isError ? (
        <div className="p-8 text-center text-sm text-destructive">
          Failed to load cases. Please refresh the page.
        </div>
      ) : cases.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="divide-y divide-border">
          {cases.map((c) => {
            const meta = CASE_STATUS_META[c.status];
            return (
              <div
                key={c.dbId ?? c.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[1.2fr_1fr_auto_auto] items-center gap-3 sm:gap-4 p-4 sm:px-5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate font-mono">{c.id}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.loanType || "—"}
                    {c.bankName ? ` · ${c.bankName}` : ""}
                  </p>
                </div>
                <p className="hidden sm:block text-xs text-muted-foreground truncate">
                  {c.assignedToName ? `By ${c.assignedToName}` : c.branchName || "—"}
                </p>
                <span
                  className={`hidden sm:inline-flex justify-self-start text-[11px] font-medium px-2 py-1 rounded-md ${meta.className}`}
                >
                  {meta.label}
                </span>
                <Button size="sm" variant="outline" className="h-8" onClick={() => onOpen(c)}>
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Review
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
