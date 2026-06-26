import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Save,
  ArrowRight,
  AlertCircle,
  Building2,
  Eye,
  ClipboardCheck,
  Info,
  TrendingUp,
  User,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FillTestDataButton } from "@/components/dev/fill-test-data-button";
import { cn } from "@/lib/utils";
import {
  BUSINESS_CATEGORIES,
  labelApplicants,
  nextModuleRoute,
  useVerificationStore,
  type BusinessDetails,
  type EmploymentDetails,
} from "@/lib/verification-store";
import { ModuleTopBar } from "@/components/module-top-bar";

export const Route = createFileRoute("/_app/verifications/business")({
  head: () => ({ meta: [{ title: "Business Activity Verification — VerifyPro" }] }),
  component: BusinessObservationsPage,
});

const premisesOptions = [
  { value: "poor", label: "Poor" },
  { value: "average", label: "Average" },
  { value: "good", label: "Good" },
  { value: "excellent", label: "Excellent" },
];

const activityOptions = [
  { value: "low", label: "Low" },
  { value: "moderate", label: "Moderate" },
  { value: "good", label: "Good" },
  { value: "excellent", label: "Excellent" },
];

const empty: BusinessDetails = {
  businessActivitySeen: "",
  numberOfEmployees: "",
  equipmentStockSeen: "",
  businessPremisesCondition: "",
  levelOfBusinessActivity: "",
  verifierRemarks: "",
  supervisorRemarks: "",
  negativeRemarks: "",
};

const testData: BusinessDetails = {
  businessActivitySeen: "yes",
  numberOfEmployees: "8",
  equipmentStockSeen: "Computers, Furniture, Printers",
  businessPremisesCondition: "good",
  levelOfBusinessActivity: "good",
  verifierRemarks: "Business operations active and functioning normally.",
  supervisorRemarks: "No adverse observations found.",
  negativeRemarks: "",
};

type Errors = Partial<Record<keyof BusinessDetails, string>>;

function BusinessObservationsPage() {
  const navigate = useNavigate();
  const applicants = useVerificationStore((s) => s.applicants);
  const activeId = useVerificationStore((s) => s.activeApplicantId);
  const saved = useVerificationStore(
    (s) => (s.modules[activeId]?.business as unknown as { business?: Partial<BusinessDetails> })?.business,
  );
  const saveBusiness = useVerificationStore((s) => s.saveBusiness);
  const employment = useVerificationStore(
    (s) => s.modules[activeId]?.employment?.employment as Partial<EmploymentDetails> | undefined,
  );
  const cat = employment?.employmentCategory ?? "";
  const isNotApplicable = !BUSINESS_CATEGORIES.includes(cat);

  const labeled = useMemo(() => labelApplicants(applicants), [applicants]);
  const activeLabel = labeled.find((a) => a.id === activeId)?.label ?? "Applicant";

  const [values, setValues] = useState<BusinessDetails>({ ...empty, ...saved });
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    setValues({ ...empty, ...(saved ?? {}) });
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const set = <K extends keyof BusinessDetails>(key: K, val: BusinessDetails[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!values.businessActivitySeen) e.businessActivitySeen = "Required";
    if (!values.numberOfEmployees.trim()) e.numberOfEmployees = "Required";
    if (!values.equipmentStockSeen.trim()) e.equipmentStockSeen = "Required";
    if (!values.businessPremisesCondition) e.businessPremisesCondition = "Required";
    if (!values.levelOfBusinessActivity) e.levelOfBusinessActivity = "Required";
    return e;
  };

  const handleFillTestData = () => {
    setValues({ ...testData });
    setErrors({});
    toast.info("Test data filled", { description: "Business activity details populated with sample data." });
  };

  const handleSaveDraft = () => {
    saveBusiness(activeId, values, "in_progress");
    toast.success("Draft saved", { description: `Business activity verification saved for ${activeLabel}.` });
  };

  const handleSaveContinue = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix the errors before continuing.");
      return;
    }
    saveBusiness(activeId, values, "completed");
    toast.success("Business activity verification completed", {
      description: `${activeLabel}'s business activity verification has been saved.`,
    });
    const __st = useVerificationStore.getState();
    const __next = nextModuleRoute(__st.modules[activeId], "business", __st.activeCaseId ? __st.cases[__st.activeCaseId]?.loanType : undefined);
    navigate({ to: __next });
  };

  // Conditional visibility
  const showNegativeRemarks =
    values.businessActivitySeen === "no" ||
    values.levelOfBusinessActivity === "low" ||
    values.businessPremisesCondition === "poor";

  // Live summary logic
  const summary = useMemo<{
    businessActivity: "positive" | "negative" | "pending";
    businessEnvironment: "positive" | "negative" | "pending";
    overall: "positive" | "negative" | "pending";
  }>(() => {
    const activityPositive = values.businessActivitySeen === "yes";
    const envPositive =
      values.levelOfBusinessActivity === "good" ||
      values.levelOfBusinessActivity === "excellent";
    const premisesPositive =
      values.businessPremisesCondition === "good" ||
      values.businessPremisesCondition === "excellent";

    const allPositive = activityPositive && envPositive && premisesPositive;
    const anyNegative =
      values.businessActivitySeen === "no" ||
      values.levelOfBusinessActivity === "low" ||
      values.businessPremisesCondition === "poor";

    const overall = allPositive ? "positive" : anyNegative ? "review" : "pending";

    return {
      businessActivity: activityPositive ? "positive" : anyNegative ? "negative" : "pending",
      businessEnvironment: envPositive && premisesPositive ? "positive" : anyNegative ? "negative" : "pending",
      overall: overall === "positive" ? "positive" : overall === "review" ? "negative" : "pending",
    };
  }, [values]);

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <ModuleTopBar />

      <div className="rounded-2xl border border-border bg-card">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 border-b border-border">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
              Business Activity Verification
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record on-site observations of business activity, premises condition, and environment.
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

        {isNotApplicable ? (
          <div className="p-6 sm:p-10">
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground mb-3">
                <Ban className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold">Not Applicable</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto">
                This section is not applicable for the selected employment category.
              </p>
              <Button
                variant="outline"
                className="mt-5 h-9"
                onClick={() => navigate({ to: "/verifications/workspace" })}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Workspace
              </Button>
            </div>
          </div>
        ) : (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Section 1 */}
          <Section icon={Eye} title="Business Activity" subtitle="On-site assessment of operations">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Business Activity Seen" required error={errors.businessActivitySeen}>
                <YesNo
                  value={values.businessActivitySeen}
                  onChange={(v) => set("businessActivitySeen", v)}
                  name="businessActivitySeen"
                />
              </Field>
              <Field label="Number Of Employees Seen" required error={errors.numberOfEmployees}>
                <Input
                  className={cn("h-11", errors.numberOfEmployees && "border-destructive")}
                  inputMode="numeric"
                  placeholder="e.g. 8"
                  value={values.numberOfEmployees}
                  onChange={(e) => set("numberOfEmployees", e.target.value)}
                />
              </Field>
              <Field
                label="Equipment / Stock Seen"
                required
                error={errors.equipmentStockSeen}
                className="sm:col-span-2"
              >
                <Textarea
                  rows={3}
                  className={cn(errors.equipmentStockSeen && "border-destructive")}
                  placeholder="Examples: Computers, Furniture, Machinery, Inventory, Office Equipment"
                  value={values.equipmentStockSeen}
                  onChange={(e) => set("equipmentStockSeen", e.target.value)}
                />
              </Field>
              <Field
                label="Business Premises Condition"
                required
                error={errors.businessPremisesCondition}
              >
                <SelectField
                  value={values.businessPremisesCondition}
                  onValueChange={(v) => set("businessPremisesCondition", v as BusinessDetails["businessPremisesCondition"])}
                  options={premisesOptions.map((o) => o.value)}
                  labels={premisesOptions}
                  placeholder="Select condition"
                  error={!!errors.businessPremisesCondition}
                />
              </Field>
              <Field
                label="Level Of Business Activity"
                required
                error={errors.levelOfBusinessActivity}
              >
                <SelectField
                  value={values.levelOfBusinessActivity}
                  onValueChange={(v) => set("levelOfBusinessActivity", v as BusinessDetails["levelOfBusinessActivity"])}
                  options={activityOptions.map((o) => o.value)}
                  labels={activityOptions}
                  placeholder="Select activity level"
                  error={!!errors.levelOfBusinessActivity}
                />
              </Field>
            </div>
          </Section>

          {/* Section 2 */}
          <Section icon={ClipboardCheck} title="Verification Remarks">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Verifier Remarks" className="sm:col-span-2">
                <Textarea
                  rows={3}
                  placeholder="Enter verifier observations..."
                  value={values.verifierRemarks}
                  onChange={(e) => set("verifierRemarks", e.target.value)}
                />
              </Field>
              <Field label="Supervisor Remarks" className="sm:col-span-2">
                <Textarea
                  rows={3}
                  placeholder="Enter supervisor comments..."
                  value={values.supervisorRemarks}
                  onChange={(e) => set("supervisorRemarks", e.target.value)}
                />
              </Field>
              {showNegativeRemarks && (
                <Field label="Negative Remarks" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    placeholder="Explain adverse observations..."
                    value={values.negativeRemarks}
                    onChange={(e) => set("negativeRemarks", e.target.value)}
                  />
                </Field>
              )}
            </div>
          </Section>

          {/* Section 3: Observation Summary */}
          <Section icon={TrendingUp} title="Observation Summary" subtitle="Live assessment based on inputs">
            <div className="rounded-xl border border-border bg-muted/40 p-5 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <SummaryItem
                  label="Business Activity"
                  status={summary.businessActivity}
                />
                <SummaryItem
                  label="Business Environment"
                  status={summary.businessEnvironment}
                />
                <SummaryItem
                  label="Overall Observation"
                  status={summary.overall}
                />
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-background border border-border px-3 py-2.5">
                {summary.overall === "positive" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-400">
                      All indicators are positive. Business verification looks favourable.
                    </span>
                  </>
                ) : summary.overall === "negative" ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-sm text-amber-700 dark:text-amber-400">
                      One or more indicators require review. Please verify the negative observations.
                    </span>
                  </>
                ) : (
                  <>
                    <Minus className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      Complete all fields above to generate the observation summary.
                    </span>
                  </>
                )}
              </div>
            </div>
          </Section>
        </div>
        )}

        {!isNotApplicable && (
          /* Footer actions */
          <div className="module-action-bar px-3 sm:px-6 py-3 sm:py-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-card sm:bg-muted/30 rounded-b-2xl mobile-actions">
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0 w-full sm:w-auto"
              onClick={handleSaveDraft}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0 w-full sm:w-auto"
              onClick={() => { handleSaveDraft(); navigate({ to: "/verifications/workspace" }); }}
            >
              Save &amp; Return
            </Button>
            <Button
              type="button"
              className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0 w-full sm:w-auto"
              onClick={handleSaveContinue}
            >
              Save &amp; Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

        )}
      </div>
    </div>
  );
}

/* Helpers */

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Eye;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-muted shrink-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="pl-9">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-[11px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

function YesNo({
  value,
  onChange,
  name,
}: {
  value: "yes" | "no" | "";
  onChange: (v: "yes" | "no") => void;
  name: string;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as "yes" | "no")}
      className="flex items-center gap-4"
    >
      <div className="flex items-center gap-2">
        <RadioGroupItem value="yes" id={`${name}-yes`} />
        <Label htmlFor={`${name}-yes`} className="text-sm font-normal cursor-pointer">
          Yes
        </Label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="no" id={`${name}-no`} />
        <Label htmlFor={`${name}-no`} className="text-sm font-normal cursor-pointer">
          No
        </Label>
      </div>
    </RadioGroup>
  );
}

function SelectField({
  value,
  onValueChange,
  options,
  labels,
  placeholder,
  error,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: string[];
  labels?: { value: string; label: string }[];
  placeholder?: string;
  error?: boolean;
}) {
  const labelMap = useMemo(() => {
    const map = new Map<string, string>();
    if (labels) labels.forEach((l) => map.set(l.value, l.label));
    return map;
  }, [labels]);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn("h-11", error && "border-destructive")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {labelMap.get(o) ?? o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SummaryItem({
  label,
  status,
}: {
  label: string;
  status: "positive" | "negative" | "pending";
}) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-background border border-border px-3 py-3">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      {status === "positive" ? (
        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Positive
        </Badge>
      ) : status === "negative" ? (
        <Badge className="bg-red-600 hover:bg-red-600 text-white text-[10px] gap-1">
          <AlertTriangle className="h-3 w-3" />
          Negative
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-[10px] gap-1">
          <Minus className="h-3 w-3" />
          Pending
        </Badge>
      )}
    </div>
  );
}
