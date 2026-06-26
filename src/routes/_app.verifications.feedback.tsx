import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Save, ArrowRight, ClipboardCheck, User, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ModuleTopBar } from "@/components/module-top-bar";
import {
  FINAL_FEEDBACK_ITEMS,
  labelApplicants,
  nextModuleRoute,
  useVerificationStore,
  type FinalFeedbackDetails,
  type FinalFeedbackItemKey,
  type FinalFeedbackStatus,
} from "@/lib/verification-store";

export const Route = createFileRoute("/_app/verifications/feedback")({
  head: () => ({ meta: [{ title: "Final Feedback — VerifyPro" }] }),
  component: FinalFeedbackPage,
});

const STATUS_OPTIONS: { value: FinalFeedbackStatus; label: string; cls: string }[] = [
  { value: "positive", label: "Positive", cls: "text-emerald-700" },
  { value: "negative", label: "Negative", cls: "text-rose-700" },
  { value: "na", label: "Not Applicable", cls: "text-slate-500" },
];

type FormState = FinalFeedbackDetails;

function emptyForm(): FormState {
  return { items: {}, guarantorPresent: "", guarantorName: "", guarantorOpinion: "" };
}

function FinalFeedbackPage() {
  const navigate = useNavigate();
  const hydrated = useVerificationStore((s) => s.isHydrated);
  const activeCaseId = useVerificationStore((s) => s.activeCaseId);
  const activeCase = useVerificationStore((s) =>
    s.activeCaseId ? s.cases[s.activeCaseId] : null,
  );
  const applicants = useVerificationStore((s) => s.applicants);
  const modulesByApp = useVerificationStore((s) => s.modules);
  const saveFeedback = useVerificationStore((s) => s.saveFeedback);

  useEffect(() => {
    if (hydrated && !activeCaseId) navigate({ to: "/verifications/drafts" });
  }, [hydrated, activeCaseId, navigate]);

  const labeled = useMemo(() => labelApplicants(applicants), [applicants]);

  // One form state per applicant id + a single guarantor block stored on primary
  const primaryId = labeled.find((a) => a.isPrimary)?.id ?? "primary";
  const [forms, setForms] = useState<Record<string, FormState>>({});

  useEffect(() => {
    if (!activeCase) return;
    const next: Record<string, FormState> = {};
    for (const a of labeled) {
      const saved = modulesByApp[a.id]?.feedback?.feedback as
        | Partial<FinalFeedbackDetails>
        | undefined;
      next[a.id] = {
        items: { ...(saved?.items ?? {}) },
        guarantorPresent:
          a.id === primaryId ? (saved?.guarantorPresent ?? "") : "",
        guarantorName: a.id === primaryId ? saved?.guarantorName ?? "" : "",
        guarantorOpinion:
          a.id === primaryId ? (saved?.guarantorOpinion ?? "") : "",
      };
    }
    setForms(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCaseId, applicants.length]);

  if (!activeCase) return null;

  const setItem = (
    appId: string,
    key: FinalFeedbackItemKey,
    value: FinalFeedbackStatus,
  ) => {
    setForms((f) => ({
      ...f,
      [appId]: { ...f[appId], items: { ...f[appId]?.items, [key]: value } },
    }));
  };

  const setGuarantorOpinion = (value: "positive" | "negative") => {
    setForms((f) => ({
      ...f,
      [primaryId]: {
        ...f[primaryId],
        guarantorOpinion: value,
      },
    }));
  };

  const setGuarantorPresent = (v: "yes" | "no") => {
    setForms((f) => ({
      ...f,
      [primaryId]: {
        ...f[primaryId],
        guarantorPresent: v,
        guarantorOpinion: v === "no" ? "" : f[primaryId]?.guarantorOpinion ?? "",
        guarantorName: v === "no" ? "" : f[primaryId]?.guarantorName ?? "",
      },
    }));
  };

  const setGuarantorName = (v: string) => {
    setForms((f) => ({
      ...f,
      [primaryId]: { ...f[primaryId], guarantorName: v },
    }));
  };

  const isAppComplete = (appId: string) => {
    const f = forms[appId];
    if (!f) return false;
    const allItems = FINAL_FEEDBACK_ITEMS.every((it) => !!f.items[it.key]);
    if (appId !== primaryId) return allItems;
    if (f.guarantorPresent === "") return false;
    if (f.guarantorPresent === "yes") {
      return allItems && !!f.guarantorOpinion;
    }
    return allItems;
  };

  const allComplete = labeled.every((a) => isAppComplete(a.id));

  const handleSave = (markCompleted: boolean) => {
    for (const a of labeled) {
      const f = forms[a.id] ?? emptyForm();
      const status = markCompleted && isAppComplete(a.id) ? "completed" : "in_progress";
      saveFeedback(a.id, f, status);
    }
    toast.success(markCompleted ? "Final Feedback saved" : "Draft saved");
  };

  const handleContinue = () => {
    if (!allComplete) {
      toast.error("Please select a status for every verification item before continuing.");
      return;
    }
    handleSave(true);
    const __st = useVerificationStore.getState();
    const next = nextModuleRoute(modulesByApp[primaryId], "feedback", __st.activeCaseId ? __st.cases[__st.activeCaseId]?.loanType : undefined);
    navigate({ to: next });
  };

  return (
    <div className="space-y-5">
      <ModuleTopBar />

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight">Final Feedback</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record the final verification outcome for each person. This drives the report summary table.
            </p>
          </div>
        </div>
      </div>

      {labeled.map((ap) => {
        const f = forms[ap.id] ?? emptyForm();
        return (
          <section
            key={ap.id}
            className="rounded-2xl border border-border bg-card p-5 sm:p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold">{ap.label}</h2>
            </div>

            <div className="space-y-4">
              {FINAL_FEEDBACK_ITEMS.map((it) => (
                <FeedbackRow
                  key={it.key}
                  label={it.label}
                  value={f.items[it.key] ?? ""}
                  onChange={(v) => setItem(ap.id, it.key, v)}
                />
              ))}
            </div>

            {ap.id === primaryId && (
              <div className="mt-6 border-t border-border pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Guarantor</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Is Guarantor Present?</Label>
                    <RadioGroup
                      value={f.guarantorPresent || undefined}
                      onValueChange={(v) => setGuarantorPresent(v as "yes" | "no")}
                      className="mt-2 flex gap-4"
                    >
                      {[
                        { v: "yes", l: "Yes" },
                        { v: "no", l: "No" },
                      ].map((o) => (
                        <label
                          key={o.v}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <RadioGroupItem value={o.v} />
                          {o.l}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>

                  {f.guarantorPresent === "yes" && (
                    <>
                      <div>
                        <Label htmlFor="guarantor-name" className="text-sm">
                          Guarantor Name (optional)
                        </Label>
                        <Input
                          id="guarantor-name"
                          value={f.guarantorName}
                          onChange={(e) => setGuarantorName(e.target.value)}
                          className="mt-1.5 max-w-md"
                          placeholder="Full name as on records"
                        />
                      </div>
                      <div className="mt-4">
                        <FeedbackRow
                          label="Overall Guarantor Feedback"
                          value={(f.guarantorOpinion as FinalFeedbackStatus) ?? ""}
                          onChange={(v) => {
                            if (v === "positive" || v === "negative") {
                              setGuarantorOpinion(v);
                            }
                          }}
                          options={[
                            { value: "positive", label: "Positive", cls: "text-emerald-700" },
                            { value: "negative", label: "Negative", cls: "text-rose-700" },
                          ]}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>
        );
      })}

      <div className="mobile-actions sticky bottom-0 sm:static -mx-4 sm:mx-0 border-t border-border bg-background/95 backdrop-blur px-4 py-3 sm:p-0 sm:border-0 sm:bg-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
          <Button
            variant="outline"
            className="h-10"
            onClick={() => handleSave(false)}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button className="h-10" onClick={handleContinue}>
            Save & Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeedbackRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: FinalFeedbackStatus;
  onChange: (v: FinalFeedbackStatus) => void;
  options?: { value: FinalFeedbackStatus; label: string; cls: string }[];
}) {
  const opts = options ?? STATUS_OPTIONS;
  return (
    <div className="rounded-lg border border-border p-3 sm:p-4">
      <Label className="text-sm font-medium">{label}</Label>
      <RadioGroup
        value={value || undefined}
        onValueChange={(v) => onChange(v as FinalFeedbackStatus)}
        className={`mt-2 grid grid-cols-1 gap-2 ${opts.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
        {opts.map((o) => (
          <label
            key={o.value}
            className={`flex items-center gap-2 text-sm cursor-pointer rounded-md border px-3 py-2 transition-colors ${
              value === o.value
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <RadioGroupItem value={o.value!} />
            <span className={o.cls}>{o.label}</span>
          </label>
        ))}
      </RadioGroup>
    </div>
  );
}
