import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Save, ArrowRight, AlertCircle, Receipt, User, Ban } from "lucide-react";
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
  type SalaryDetails,
  type EmploymentDetails,
} from "@/lib/verification-store";
import { ModuleTopBar } from "@/components/module-top-bar";

export const Route = createFileRoute("/_app/verifications/salary")({
  head: () => ({ meta: [{ title: "Salary / Form-16 Verification — VerifyPro" }] }),
  component: SalaryVerificationPage,
});

const empty: SalaryDetails = {
  companyName: "",
  designation: "",
  yearsOfService: "",
  serviceConfirmed: "",
  grossMonthlyIncome: "",
  totalIncome: "",
  incomeUnderSalaryHeadVerified: "",
  taxCalculationVerified: "",
  form16TaxPayableCorrect: "",
  remarks: "",
};

const testData: SalaryDetails = {
  companyName: "Commissioner of Health & Family Welfare",
  designation: "Community Health Officer",
  yearsOfService: "4",
  serviceConfirmed: "yes",
  grossMonthlyIncome: "24800",
  totalIncome: "297600",
  incomeUnderSalaryHeadVerified: "yes",
  taxCalculationVerified: "yes",
  form16TaxPayableCorrect: "yes",
  remarks: "Income documents verified successfully.",
};

type Errors = Partial<Record<keyof SalaryDetails, string>>;

function SalaryVerificationPage() {
  const navigate = useNavigate();
  const applicants = useVerificationStore((s) => s.applicants);
  const activeId = useVerificationStore((s) => s.activeApplicantId);
  const saved = useVerificationStore(
    (s) => s.modules[activeId]?.salary?.salary as Partial<SalaryDetails> | undefined,
  );
  const employment = useVerificationStore(
    (s) => s.modules[activeId]?.employment?.employment as Partial<EmploymentDetails> | undefined,
  );
  const saveSalary = useVerificationStore((s) => s.saveSalary);

  const labeled = useMemo(() => labelApplicants(applicants), [applicants]);
  const activeLabel = labeled.find((a) => a.id === activeId)?.label ?? "Applicant";

  const [values, setValues] = useState<SalaryDetails>({ ...empty, ...saved });
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    setValues({ ...empty, ...(saved ?? {}) });
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const set = <K extends keyof SalaryDetails>(key: K, val: SalaryDetails[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const category = employment?.employmentCategory ?? "";
  const NON_EMPLOYED = ["housewife", "retired", "unemployed", "student"];
  const notApplicableMsg =
    category === "business_owner"
      ? "Salary Verification is not applicable for Business Owners. Income proof and business-related supporting documents are verified through the business verification process."
      : category === "self_employed"
        ? "Salary Verification is not applicable for Self Employed Applicants. Income proof is verified through the business verification process."
        : NON_EMPLOYED.includes(category)
          ? "Salary Verification is not applicable for the selected employment category."
          : null;

  const validate = (): Errors => {
    const e: Errors = {};
    if (!values.companyName.trim()) e.companyName = "Company name is required";
    if (!values.designation.trim()) e.designation = "Designation is required";
    if (!values.yearsOfService.trim()) e.yearsOfService = "Years of service is required";
    else if (Number.isNaN(Number(values.yearsOfService)))
      e.yearsOfService = "Must be a number";
    if (!values.serviceConfirmed) e.serviceConfirmed = "Please select an option";
    if (!values.grossMonthlyIncome.trim())
      e.grossMonthlyIncome = "Gross monthly income is required";
    else if (Number.isNaN(Number(values.grossMonthlyIncome)))
      e.grossMonthlyIncome = "Must be a number";
    if (values.totalIncome && Number.isNaN(Number(values.totalIncome)))
      e.totalIncome = "Must be a number";
    return e;
  };

  const handleFillTestData = () => {
    setValues({ ...testData });
    setErrors({});
    toast.info("Test data filled", { description: "All fields populated with sample data." });
  };

  const handleSaveDraft = () => {
    saveSalary(activeId, values, "in_progress");
    toast.success("Draft saved", {
      description: `Salary / Form-16 Verification saved for ${activeLabel}.`,
    });
  };

  const handleSaveContinue = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix the errors before continuing.");
      return;
    }
    saveSalary(activeId, values, "completed");
    toast.success("Salary / Form-16 Verification completed", {
      description: `${activeLabel}'s salary verification has been saved.`,
    });
    const __st = useVerificationStore.getState();
    const __next = nextModuleRoute(__st.modules[activeId], "salary", __st.activeCaseId ? __st.cases[__st.activeCaseId]?.loanType : undefined);
    navigate({ to: __next });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <ModuleTopBar />

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 border-b border-border">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Receipt className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
              Salary Slip / Form-16 Verification
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Validate employer, income, and tax details against payslips and Form-16.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {!notApplicableMsg && <FillTestDataButton onFill={handleFillTestData} />}
            <Badge variant="secondary" className="text-[11px] gap-1.5">
              <User className="h-3 w-3" />
              {activeLabel}
            </Badge>
          </div>
        </div>

        {notApplicableMsg ? (
          <div className="p-6 sm:p-10">
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground mb-3">
                <Ban className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold">Module Not Applicable</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto">
                {notApplicableMsg}
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
          <>
            <div className="p-5 sm:p-6 space-y-6">
              <Section title="Employer Information" subtitle="Details of the applicant's employer.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Company / Institution / Firm Name"
                    required
                    error={errors.companyName}
                  >
                    <Input
                      className={cn("h-11", errors.companyName && "border-destructive")}
                      placeholder="e.g. Commissioner of Health & Family Welfare"
                      value={values.companyName}
                      onChange={(e) => set("companyName", e.target.value)}
                    />
                  </Field>
                  <Field label="Applicant Designation" required error={errors.designation}>
                    <Input
                      className={cn("h-11", errors.designation && "border-destructive")}
                      placeholder="e.g. Community Health Officer"
                      value={values.designation}
                      onChange={(e) => set("designation", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Years Of Service With Organization"
                    required
                    error={errors.yearsOfService}
                  >
                    <Input
                      type="number"
                      min="0"
                      className={cn("h-11", errors.yearsOfService && "border-destructive")}
                      placeholder="e.g. 4"
                      value={values.yearsOfService}
                      onChange={(e) => set("yearsOfService", e.target.value)}
                    />
                  </Field>
                </div>
              </Section>

              <Section
                title="Employment Confirmation"
                subtitle="Confirm whether the applicant's service is verified."
              >
                <Field label="Service Confirmed" required error={errors.serviceConfirmed}>
                  <RadioGroup
                    className="flex gap-4 pt-1"
                    value={values.serviceConfirmed}
                    onValueChange={(v) =>
                      set("serviceConfirmed", v as SalaryDetails["serviceConfirmed"])
                    }
                  >
                    <RadioPill value="yes" name="sc" label="Yes" />
                    <RadioPill value="no" name="sc" label="No" />
                  </RadioGroup>
                </Field>
              </Section>

              <Section
                title="Income Verification"
                subtitle="Cross-check declared income against salary slip / Form-16."
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field
                    label="Gross Monthly Income (₹)"
                    required
                    error={errors.grossMonthlyIncome}
                  >
                    <Input
                      type="number"
                      min="0"
                      className={cn("h-11", errors.grossMonthlyIncome && "border-destructive")}
                      placeholder="e.g. 24800"
                      value={values.grossMonthlyIncome}
                      onChange={(e) => set("grossMonthlyIncome", e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Total Income As Per Salary Slip / Form-16 (₹)"
                    error={errors.totalIncome}
                  >
                    <Input
                      type="number"
                      min="0"
                      className={cn("h-11", errors.totalIncome && "border-destructive")}
                      placeholder="e.g. 297600"
                      value={values.totalIncome}
                      onChange={(e) => set("totalIncome", e.target.value)}
                    />
                  </Field>
                  <Field label="Income Under Salary Head Verified">
                    <TriRadio
                      name="ush"
                      value={values.incomeUnderSalaryHeadVerified}
                      onChange={(v) => set("incomeUnderSalaryHeadVerified", v)}
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Tax Verification" subtitle="Verify tax computation and Form-16 entries.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Tax Calculation Verified">
                    <TriRadio
                      name="tcv"
                      value={values.taxCalculationVerified}
                      onChange={(v) => set("taxCalculationVerified", v)}
                    />
                  </Field>
                  <Field label="Form-16 Tax Payable Correct">
                    <TriRadio
                      name="ftp"
                      value={values.form16TaxPayableCorrect}
                      onChange={(v) => set("form16TaxPayableCorrect", v)}
                    />
                  </Field>
                </div>
              </Section>

              <Section title="Remarks" subtitle="Additional observations or notes.">
                <Field label="Remarks">
                  <Textarea
                    placeholder="Enter any observations regarding income documents..."
                    value={values.remarks}
                    onChange={(e) => set("remarks", e.target.value)}
                    rows={4}
                    maxLength={1000}
                  />
                </Field>
              </Section>
            </div>

            <div className="module-action-bar px-3 sm:px-6 py-3 sm:py-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-card sm:bg-muted/30 rounded-b-2xl mobile-actions">
              <p className="hidden sm:block text-xs text-muted-foreground">
            Status updates only after a successful Save &amp; Continue.
              </p>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-2 sm:justify-end">
                <Button
                  variant="outline"
                  className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0"
                  onClick={handleSaveDraft}
                >
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
          </>
        )}
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

function RadioPill({ value, name, label }: { value: string; name: string; label: string }) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <RadioGroupItem value={value} id={`${name}-${value}`} />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function TriRadio({
  name,
  value,
  onChange,
}: {
  name: string;
  value: "yes" | "no" | "na" | "";
  onChange: (v: "yes" | "no" | "na") => void;
}) {
  return (
    <RadioGroup
      className="flex flex-wrap gap-4 pt-1"
      value={value}
      onValueChange={(v) => onChange(v as "yes" | "no" | "na")}
    >
      <RadioPill value="yes" name={name} label="Yes" />
      <RadioPill value="no" name={name} label="No" />
      <RadioPill value="na" name={name} label="Not Applicable" />
    </RadioGroup>
  );
}
