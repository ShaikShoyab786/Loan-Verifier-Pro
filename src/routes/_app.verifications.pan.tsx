import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Save,
  ArrowRight,
  AlertCircle,
  IdCard,
  User,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FillTestDataButton } from "@/components/dev/fill-test-data-button";
import { cn } from "@/lib/utils";
import {
  labelApplicants,
  nextModuleRoute,
  useVerificationStore,
  type PanDetails,
} from "@/lib/verification-store";
import { ModuleTopBar } from "@/components/module-top-bar";

export const Route = createFileRoute("/_app/verifications/pan")({
  head: () => ({ meta: [{ title: "PAN Verification — VerifyPro" }] }),
  component: PanVerificationPage,
});

const PAN_FULL = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const VALID_4TH = new Set(["P", "C", "H", "F", "A", "T", "B", "L", "J", "G"]);

const empty: PanDetails = {
  panNumber: "",
  nameMatching: "",
  genderMatching: "",
  panVerifiedOfficial: "",
  finalStatus: "",
  verifierRemarks: "",
  supervisorRemarks: "",
  negativeRemarks: "",
};

const testData: PanDetails = {
  panNumber: "ABCDE1234F",
  nameMatching: "yes",
  genderMatching: "yes",
  panVerifiedOfficial: "yes",
  finalStatus: "confirmed",
  verifierRemarks: "Applicant's PAN details fully match the official records.",
  supervisorRemarks: "Verification reviewed and approved.",
  negativeRemarks: "",
};

type Errors = Partial<Record<keyof PanDetails, string>>;

type StructureChecks = {
  formatValid: boolean;
  lastCharAlpha: boolean;
  middleNumeric: boolean;
  fourthCharValid: boolean;
  structureValid: boolean;
};

function computeChecks(pan: string): StructureChecks {
  const p = pan.toUpperCase();
  const formatValid = PAN_FULL.test(p);
  const lastCharAlpha = p.length === 10 && /[A-Z]/.test(p[9] ?? "");
  const middleNumeric = p.length >= 9 && /^[0-9]{4}$/.test(p.slice(5, 9));
  const fourthCharValid = p.length >= 4 && VALID_4TH.has(p[3] ?? "");
  return {
    formatValid,
    lastCharAlpha,
    middleNumeric,
    fourthCharValid,
    structureValid: formatValid && lastCharAlpha && middleNumeric && fourthCharValid,
  };
}

function PanVerificationPage() {
  const navigate = useNavigate();
  const applicants = useVerificationStore((s) => s.applicants);
  const activeId = useVerificationStore((s) => s.activeApplicantId);
  const saved = useVerificationStore(
    (s) => s.modules[activeId]?.pan?.pan as Partial<PanDetails> | undefined,
  );
  const savePan = useVerificationStore((s) => s.savePan);

  const labeled = useMemo(() => labelApplicants(applicants), [applicants]);
  const activeLabel = labeled.find((a) => a.id === activeId)?.label ?? "Applicant";

  const [values, setValues] = useState<PanDetails>({ ...empty, ...saved });
  const [errors, setErrors] = useState<Errors>({});
  const [autoSuggested, setAutoSuggested] = useState(false);

  useEffect(() => {
    setValues({ ...empty, ...(saved ?? {}) });
    setErrors({});
    setAutoSuggested(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const checks = useMemo(() => computeChecks(values.panNumber), [values.panNumber]);

  // Auto-suggest "Confirmed" final status when all positive
  useEffect(() => {
    const allPositive =
      values.nameMatching === "yes" &&
      values.genderMatching === "yes" &&
      values.panVerifiedOfficial === "yes" &&
      checks.structureValid;
    if (allPositive && !values.finalStatus && !autoSuggested) {
      setValues((v) => ({ ...v, finalStatus: "confirmed" }));
      setAutoSuggested(true);
      toast.info("Final Status suggested: Confirmed", {
        description: "All checks passed. You can change this manually.",
      });
    }
  }, [
    values.nameMatching,
    values.genderMatching,
    values.panVerifiedOfficial,
    checks.structureValid,
    values.finalStatus,
    autoSuggested,
  ]);

  const set = <K extends keyof PanDetails>(key: K, val: PanDetails[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!values.panNumber.trim()) e.panNumber = "PAN Number is required";
    else if (!PAN_FULL.test(values.panNumber.toUpperCase()))
      e.panNumber = "Invalid PAN. Format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)";
    if (!values.nameMatching) e.nameMatching = "Please select an option";
    if (!values.genderMatching) e.genderMatching = "Please select an option";
    if (!values.panVerifiedOfficial) e.panVerifiedOfficial = "Please select an option";
    if (!values.finalStatus) e.finalStatus = "Final Status is required";
    return e;
  };

  const handleFillTestData = () => {
    setValues({ ...testData });
    setErrors({});
    toast.info("Test data filled", { description: "All fields populated with sample data." });
  };

  const handleSaveDraft = () => {
    savePan(activeId, { ...values, panNumber: values.panNumber.toUpperCase() }, "in_progress");
    toast.success("Draft saved", { description: `PAN Verification saved for ${activeLabel}.` });
  };

  const handleSaveContinue = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix the errors before continuing.");
      return;
    }
    savePan(activeId, { ...values, panNumber: values.panNumber.toUpperCase() }, "completed");
    toast.success("PAN Verification completed", {
      description: `${activeLabel}'s PAN verification has been saved.`,
    });
    const __st = useVerificationStore.getState();
    const __next = nextModuleRoute(__st.modules[activeId], "pan", __st.activeCaseId ? __st.cases[__st.activeCaseId]?.loanType : undefined);
    navigate({ to: __next });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <ModuleTopBar />

      <div className="rounded-2xl border border-border bg-card">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 border-b border-border">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <IdCard className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">PAN Verification</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Validate PAN authenticity, structure, and match against official records.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <FillTestDataButton onFill={handleFillTestData} />
            <Badge variant="secondary" className="text-[11px] gap-1.5">
              <User className="h-3 w-3" />
              {activeLabel}
            </Badge>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Section 1 */}
          <Section title="PAN Details" subtitle="Enter the PAN as printed on the card.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="PAN Number" required error={errors.panNumber}>
                <Input
                  className={cn(
                    "h-11 uppercase tracking-[0.2em] font-mono",
                    errors.panNumber && "border-destructive",
                  )}
                  placeholder="ABCDE1234F"
                  value={values.panNumber}
                  onChange={(e) =>
                    set(
                      "panNumber",
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
                    )
                  }
                  maxLength={10}
                />
              </Field>
            </div>
          </Section>

          {/* Section 2 */}
          <Section
            title="PAN Verification"
            subtitle="Confirm match against applicant's submitted details."
          >
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Name Matching" required error={errors.nameMatching}>
                <YesNoRadio
                  name="nameMatching"
                  value={values.nameMatching}
                  onChange={(v) => set("nameMatching", v)}
                />
              </Field>
              <Field label="Gender Matching" required error={errors.genderMatching}>
                <YesNoRadio
                  name="genderMatching"
                  value={values.genderMatching}
                  onChange={(v) => set("genderMatching", v)}
                />
              </Field>
              <Field
                label="PAN Verified From Official Source"
                required
                error={errors.panVerifiedOfficial}
              >
                <YesNoRadio
                  name="panVerifiedOfficial"
                  value={values.panVerifiedOfficial}
                  onChange={(v) => set("panVerifiedOfficial", v)}
                />
              </Field>
            </div>
          </Section>

          {/* Section 3 */}
          <Section
            title="Automatic PAN Structure Checks"
            subtitle="System-generated validations based on the PAN entered."
          >
            <div className="grid gap-2 sm:grid-cols-2">
              <CheckBadge label="PAN Format Valid" ok={checks.formatValid} />
              <CheckBadge label="10th Character Alphabetic" ok={checks.lastCharAlpha} />
              <CheckBadge label="6th–9th Characters Numeric" ok={checks.middleNumeric} />
              <CheckBadge label="4th Character Category Valid" ok={checks.fourthCharValid} />
              <CheckBadge
                label="PAN Structure Valid"
                ok={checks.structureValid}
                emphasis
              />
            </div>
          </Section>

          {/* Section 4 */}
          <Section
            title="Verification Outcome"
            subtitle="Conclude verification and capture remarks."
          >
            <div className="grid gap-5">
              <Field label="Final Status" required error={errors.finalStatus}>
                <RadioGroup
                  className="flex flex-wrap gap-4 pt-1"
                  value={values.finalStatus}
                  onValueChange={(v) => set("finalStatus", v as PanDetails["finalStatus"])}
                >
                  <RadioOption value="confirmed" label="Confirmed" />
                  <RadioOption value="not_confirmed" label="Not Confirmed" />
                </RadioGroup>
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Verifier Remarks">
                  <Textarea
                    placeholder="Notes from field executive"
                    value={values.verifierRemarks}
                    onChange={(e) => set("verifierRemarks", e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                </Field>
                <Field label="Supervisor Remarks">
                  <Textarea
                    placeholder="Supervisor review notes"
                    value={values.supervisorRemarks}
                    onChange={(e) => set("supervisorRemarks", e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                </Field>
                <Field label="Detailed Negative Remarks">
                  <Textarea
                    placeholder="Any discrepancy or red flag observed"
                    value={values.negativeRemarks}
                    onChange={(e) => set("negativeRemarks", e.target.value)}
                    rows={3}
                    maxLength={500}
                    className="sm:col-span-2"
                  />
                </Field>
              </div>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="module-action-bar px-3 sm:px-6 py-3 sm:py-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-card sm:bg-muted/30 rounded-b-2xl mobile-actions">
          <p className="hidden sm:block text-xs text-muted-foreground">
            Status updates only after a successful Save &amp; Continue.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2 sm:justify-end">
            <Button variant="outline" className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0" onClick={handleSaveDraft}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              variant="outline"
              className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0"
              onClick={() => { handleSaveDraft(); navigate({ to: "/verifications/workspace" }); }}
            >
              Save &amp; Return
            </Button>
            <Button className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0" onClick={handleSaveContinue}>
              Save &amp; Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/70 bg-background/40 p-4 sm:p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function RadioOption({ value, label }: { value: string; label: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <RadioGroupItem value={value} id={`r-${value}-${Math.random()}`} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function YesNoRadio({
  name,
  value,
  onChange,
}: {
  name: string;
  value: "yes" | "no" | "";
  onChange: (v: "yes" | "no") => void;
}) {
  return (
    <RadioGroup
      className="flex gap-4 pt-1"
      value={value}
      onValueChange={(v) => onChange(v as "yes" | "no")}
    >
      <label className="inline-flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="yes" id={`${name}-yes`} />
        <span className="text-sm">Yes</span>
      </label>
      <label className="inline-flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="no" id={`${name}-no`} />
        <span className="text-sm">No</span>
      </label>
    </RadioGroup>
  );
}

function CheckBadge({
  label,
  ok,
  emphasis,
}: {
  label: string;
  ok: boolean;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
        ok
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-destructive/30 bg-destructive/5",
        emphasis && "font-medium",
      )}
    >
      <span className="truncate">{label}</span>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Valid
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
          <XCircle className="h-3.5 w-3.5" />
          Invalid
        </span>
      )}
    </div>
  );
}
