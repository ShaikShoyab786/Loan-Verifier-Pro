import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ClipboardList,
  FileCheck2,
  FileText,
  ShieldCheck,
  Lock,
  Mail,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Sign In — VerifyPro" },
      { name: "description", content: "Secure login for VerifyPro verification executives." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const isInvalidCredentials = error.message
            .toLowerCase()
            .includes("invalid login credentials");
          if (isInvalidCredentials) {
            toast.error("Unable to sign in", {
              description:
                "Check your email and password. If this is a new account, confirm your email first.",
            });
            return;
          }
          throw error;
        }
        toast.success("Signed in");
        navigate({ to: "/dashboard" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;

        if (data.session) {
          toast.success("Account created");
          navigate({ to: "/dashboard" });
        } else {
          setPassword("");
          setMode("signin");
          toast.success("Account created", {
            description: "Check your email to confirm your account, then sign in.",
          });
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        toast.error(error.message ?? "Google sign-in failed");
        setBusy(false);
        return;
      }
      // On success the browser redirects to Google's consent screen.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email above first");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent", { description: "Check your inbox for a reset link." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-page min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="auth-brand-panel relative flex min-h-[430px] overflow-hidden p-6 text-primary-foreground flex-col justify-between sm:p-10 lg:min-h-screen xl:p-12">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="auth-brand-grid absolute inset-0 opacity-30" />
          <div className="auth-brand-orb auth-brand-orb-one absolute -right-32 top-16 h-96 w-96 rounded-full" />
          <div className="auth-brand-orb auth-brand-orb-two absolute -bottom-40 -left-24 h-[28rem] w-[28rem] rounded-full" />
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="auth-brand-mark group grid h-12 w-12 place-items-center rounded-2xl bg-white/10 backdrop-blur">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-white/90">VerifyPro</p>
            <p className="text-xs text-white/60">Due Diligence Suite</p>
          </div>
        </div>

        <div className="relative z-10 my-10 max-w-xl lg:my-8">
          <div className="auth-hero-reveal">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
              Built for field verification teams
            </p>
            <h1 className="mt-4 max-w-lg text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-white xl:text-[2.75rem]">
              Prepare <span className="auth-headline-accent">Due Diligence</span> reports without Microsoft Word.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-white/75">
              Collect applicant information in one place, complete each verification section,
              and generate a professional report in a few clicks.
            </p>
          </div>

          <div className="mt-8 hidden gap-3 sm:grid" aria-label="How VerifyPro works">
            {[
              {
                icon: ClipboardList,
                title: "Collect applicant details",
                description: "Record the information gathered during your field visit.",
              },
              {
                icon: FileCheck2,
                title: "Complete verification sections",
                description: "Organize employment, residence, business, and document details.",
              },
              {
                icon: FileText,
                title: "Generate the final report",
                description: "Turn the completed information into a ready-to-share report.",
              },
            ].map(({ icon: Icon, title, description }, index) => (
              <div
                key={title}
                className="auth-feature-card group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-3"
                style={{ animationDelay: `${index * 100 + 200}ms` }}
              >
                <div className="auth-feature-icon grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/95">{title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-white/60">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-6 inline-flex items-center rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-xs text-white/75">
            Less retyping. Fewer formatting mistakes.
          </p>
        </div>

        <p className="relative z-10 text-xs text-white/50">
          © {new Date().getFullYear()} VerifyPro Financial Services
        </p>
      </div>

      <div className="auth-form-panel relative flex items-center justify-center overflow-hidden p-6 sm:p-12">
        <div className="pointer-events-none absolute -right-24 top-12 h-72 w-72 rounded-full bg-primary/[0.04] blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-28 h-80 w-80 rounded-full bg-blue-300/[0.05] blur-3xl" aria-hidden="true" />
        <div className="auth-form-shell relative z-10 w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="auth-brand-mark grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="font-semibold">VerifyPro</p>
          </div>

          <p className="lg:hidden mb-6 text-sm leading-6 text-muted-foreground">
            Collect applicant information and generate verification reports without manual Word editing.
          </p>

          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to your executive account."
              : "Set up your VerifyPro executive account."}
          </p>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")} className="mt-6">
            <TabsList className="auth-tabs grid w-full grid-cols-2">
              <TabsTrigger className="auth-tab" value="signin">Sign in</TabsTrigger>
              <TabsTrigger className="auth-tab" value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <EmailForm
                mode="signin"
                email={email}
                password={password}
                fullName={fullName}
                setEmail={setEmail}
                setPassword={setPassword}
                setFullName={setFullName}
                onSubmit={handleEmail}
                busy={busy}
              />
            </TabsContent>
            {mode === "signin" && (
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={busy}
                className="auth-secondary-link mt-3 text-xs disabled:opacity-50"
              >
                Forgot your password?
              </button>
            )}
            <TabsContent value="signup" className="mt-6">
              <EmailForm
                mode="signup"
                email={email}
                password={password}
                fullName={fullName}
                setEmail={setEmail}
                setPassword={setPassword}
                setFullName={setFullName}
                onSubmit={handleEmail}
                busy={busy}
              />
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            OR
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="auth-google-button h-11 w-full"
            onClick={handleGoogle}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="auth-google-mark" aria-hidden="true">G</span>
                Continue with Google
              </>
            )}
          </Button>

          <p className="auth-security-note mt-6 text-center text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Protected by enterprise-grade encryption.
          </p>
        </div>
      </div>
    </div>
  );
}

function EmailForm(props: {
  mode: "signin" | "signup";
  email: string;
  password: string;
  fullName: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setFullName: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  busy: boolean;
}) {
  const { mode, email, password, fullName, setEmail, setPassword, setFullName, onSubmit, busy } = props;
  return (
    <form onSubmit={onSubmit} className="auth-form space-y-4">
      {mode === "signup" && (
        <div className="space-y-2">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Rahul Sharma"
            className="auth-input h-11"
            required
          />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
             className="auth-input h-11 pl-9"
            autoComplete="email"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
        />
      </div>
        <Button type="submit" className="auth-submit-button h-11 w-full text-sm font-medium" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in securely" : "Create account"}
      </Button>
    </form>
  );
}

function PasswordInput(props: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        id={props.id}
        type={show ? "text" : "password"}
        value={props.value}
        onChange={props.onChange}
        placeholder="••••••••"
         className="auth-input h-11 pl-9 pr-10"
        autoComplete={props.autoComplete}
        minLength={6}
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
         className="auth-password-toggle absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        aria-label={show ? "Hide password" : "Show password"}
         tabIndex={0}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
