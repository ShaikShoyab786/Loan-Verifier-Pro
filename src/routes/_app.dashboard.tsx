import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  FilePlus2,
  FileClock,
  FileCheck2,
  AlertCircle,
  MapPin,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
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
  const completedCount = cases.filter(
    (c) => c.status === "submitted" || c.status === "approved",
  ).length;
  const pendingCount = cases.filter((c) => c.status === "submitted").length;

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
      value: String(draftCount),
      sub: "Awaiting completion",
      icon: FileClock,
      tone: "amber" as const,
    },
    {
      to: "/verifications/drafts",
      label: "In Progress",
      value: String(inProgressCount),
      sub: "Actively being worked on",
      icon: MapPin,
      tone: "indigo" as const,
    },
    {
      to: "/verifications/completed",
      label: "Completed Verifications",
      value: String(completedCount),
      sub: "Submitted or approved",
      icon: FileCheck2,
      tone: "emerald" as const,
    },
    {
      to: "/reports",
      label: "Pending Approval",
      value: String(pendingCount),
      sub: "Awaiting review",
      icon: AlertCircle,
      tone: "rose" as const,
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
          <p className="text-xs font-medium text-muted-foreground">Good morning, {firstName}</p>
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
              <Row label="Completed" value={completedCount} />
            </div>
          </div>

        </div>
      </div>
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
