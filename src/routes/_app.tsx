import { Link, Outlet, createFileRoute, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FilePlus2,
  FileClock,
  FileCheck2,
  FileBarChart,
  Settings,
  ShieldCheck,
  Bell,
  Search,
  LogOut,
  Menu,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { CaseSyncProvider } from "@/lib/case-sync-provider";
import { useVerificationStore } from "@/lib/verification-store";

export const Route = createFileRoute("/_app")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    // Resolve the user's role(s). RLS lets each user read their own roles.
    let roles: string[] = [];
    try {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      roles = (roleRows ?? []).map((r) => r.role as string);
    } catch {
      roles = [];
    }
    const isManager = roles.includes("manager");
    // Lock all field-editing actions for manager sessions before any route renders.
    // Managers review only; this prevents edits even via direct route navigation.
    useVerificationStore.getState().setManagerSession(isManager);
    return { user: data.user, roles, isManager };
  },
  component: AppLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

const executiveNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/verifications/new", label: "New Verification", icon: FilePlus2 },
  { to: "/verifications/drafts", label: "Draft Verifications", icon: FileClock },
  { to: "/verifications/completed", label: "Completed Verifications", icon: FileCheck2 },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/settings", label: "Settings", icon: Settings },
];

const managerNav: NavItem[] = [
  { to: "/dashboard", label: "Approvals Dashboard", icon: LayoutDashboard },
  { to: "/settings", label: "Settings", icon: Settings },
];

function AppLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { user, isManager } = Route.useRouteContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const navItems = isManager ? managerNav : executiveNav;
  const roleLabel = isManager ? "Manager" : "Field Executive";

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ||
    user.email ||
    "Executive";
  const initials = displayName
    .split(/\s+/)
    .map((s: string) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        void queryClient.cancelQueries();
        queryClient.clear();
        useVerificationStore.getState().resetStore();
        navigate({ to: "/auth", replace: true });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, queryClient]);

  const handleSignOut = async () => {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      useVerificationStore.getState().resetStore();
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign out failed");
    }
  };


  const SidebarBody = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate text-sidebar-foreground">VerifyPro</p>
          <p className="text-[11px] text-muted-foreground truncate">Due Diligence Suite</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
        {navItems.map((item) => {
          const active =
            pathname === item.to ||
            (item.to !== "/dashboard" && pathname.startsWith(item.to));
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-4">
        <p className="text-xs font-medium text-sidebar-foreground">Need help?</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Reach our support desk 24×7 for case escalations.
        </p>
        <Button variant="outline" size="sm" className="mt-3 w-full h-8 text-xs">
          Contact Support
        </Button>
      </div>

      <div className="border-t border-sidebar-border p-3">
        <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {initials || "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate text-sidebar-foreground">{displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">{roleLabel}</p>
            </div>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </AlertDialogTrigger>
          </div>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
              <AlertDialogDescription>
                You will be signed out of your VerifyPro account and will need to sign in again to access your workspace.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setLogoutOpen(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignOut}>Log out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 shrink-0 border-r border-sidebar-border bg-sidebar">
        {SidebarBody}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-72 bg-sidebar border-r border-sidebar-border">
            {SidebarBody}
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full">
        <header className="sticky top-0 z-30 h-16 border-b border-border bg-background/80 backdrop-blur">
          <div className="h-full px-3 sm:px-6 flex items-center gap-2 sm:gap-3">
            <button
              className="lg:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>

            <div className="relative flex-1 min-w-0 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search…"
                className="pl-9 h-9 bg-muted/50 border-transparent focus-visible:bg-background"
              />
            </div>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted">
                <Bell className="h-4 w-4" />
              </button>
              <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-border h-9">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {initials || "U"}
                </div>
                <div className="leading-tight">
                  <p className="text-xs font-medium">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-hidden">
          <CaseSyncProvider>
            <Outlet />
          </CaseSyncProvider>
        </main>
      </div>
    </div>
  );
}
