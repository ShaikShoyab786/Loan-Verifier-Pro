import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Save,
  ArrowRight,
  AlertCircle,
  FolderCheck,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CircleDashed,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FillTestDataButton } from "@/components/dev/fill-test-data-button";
import {
  NON_EMPLOYED_CATEGORIES,
  labelApplicants,
  nextModuleRoute,
  useVerificationStore,
  type DocumentsDetails,
  type EmploymentDetails,
} from "@/lib/verification-store";
import { ModuleTopBar } from "@/components/module-top-bar";

export const Route = createFileRoute("/_app/verifications/documents")({
  head: () => ({ meta: [{ title: "Documents Verification — VerifyPro" }] }),
  component: DocumentsVerificationPage,
});

const empty: DocumentsDetails = {
  sealOfOrganization: "",
  signatureOfAuthority: "",
  salarySlipDateAmount: "",
  officeAddressCorrect: "",
};

const testData: DocumentsDetails = {
  sealOfOrganization: "tallied",
  signatureOfAuthority: "tallied",
  salarySlipDateAmount: "tallied",
  officeAddressCorrect: "tallied",
};

type VerificationValue = "tallied" | "not_tallied" | "not_applicable";

type Errors = Partial<Record<keyof DocumentsDetails, string>>;

function DocumentsVerificationPage() {
  const navigate = useNavigate();
  const applicants = useVerificationStore((s) => s.applicants);
  const activeId = useVerificationStore((s) => s.activeApplicantId);
  const saved = useVerificationStore(
    (s) => s.modules[activeId]?.documents?.documents as Partial<DocumentsDetails> | undefined,
  );
  const saveDocuments = useVerificationStore((s) => s.saveDocuments);
  const employment = useVerificationStore(
    (s) => s.modules[activeId]?.employment?.employment as Partial<EmploymentDetails> | undefined,
  );
  const isNotApplicable = NON_EMPLOYED_CATEGORIES.includes(employment?.employmentCategory ?? "");

  const labeled = useMemo(() => labelApplicants(applicants), [applicants]);
  const activeLabel = labeled.find((a) => a.id === activeId)?.label ?? "Applicant";

  const [values, setValues] = useState<DocumentsDetails>({ ...empty, ...saved });
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    setValues({ ...empty, ...(saved ?? {}) });
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const set = <K extends keyof DocumentsDetails>(key: K, val: DocumentsDetails[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!values.sealOfOrganization) e.sealOfOrganization = "Please select an option";
    if (!values.signatureOfAuthority) e.signatureOfAuthority = "Please select an option";
    if (!values.salarySlipDateAmount) e.salarySlipDateAmount = "Please select an option";
    if (!values.officeAddressCorrect) e.officeAddressCorrect = "Please select an option";
    return e;
  };

  const summary = useMemo(() => {
    const items = [
      { key: "sealOfOrganization", label: "Seal Verification" },
      { key: "signatureOfAuthority", label: "Authority Signature" },
      { key: "salarySlipDateAmount", label: "Salary Details" },
      { key: "officeAddressCorrect", label: "Office Address" },
    ] as const;

    const results = items.map((item) => ({
      label: item.label,
      value: values[item.key] as VerificationValue | "",
    }));

    const allTallied = results.every((r) => r.value === "tallied");
    const anyNotTallied = results.some((r) => r.value === "not_tallied");

    const overallStatus = allTallied
      ? "positive"
      : anyNotTallied
        ? "review"
        : ("pending" as const);

    return { results, overallStatus };
  }, [values]);

  const handleFillTestData = () => {
    setValues({ ...testData });
    setErrors({});
    toast.info("Test data filled", { description: "All fields populated with sample data." });
  };

  const handleSaveDraft = () => {
    saveDocuments(activeId, values, "in_progress");
    toast.success("Draft saved", { description: `Documents Verification saved for ${activeLabel}.` });
  };

  const handleSaveContinue = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix the errors before continuing.");
      return;
    }
    saveDocuments(activeId, values, "completed");
    toast.success("Documents Verification completed", {
      description: `${activeLabel}'s documents verification has been saved.`,
    });
    const __st = useVerificationStore.getState();
    const __next = nextModuleRoute(__st.modules[activeId], "documents", __st.activeCaseId ? __st.cases[__st.activeCaseId]?.loanType : undefined);
    navigate({ to: __next });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <ModuleTopBar />

      <div className="rounded-2xl border border-border bg-card">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 border-b border-border">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <FolderCheck className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
              Documents Verification
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cross-verify document consistency against issuing authority records.
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
                Document tally is not applicable for the selected employment category.
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
        ) : (<>
        {/* Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Section 1 */}
          <Section
            title="Document Consistency Verification"
            subtitle="Verify each document element against the original issuing source."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Seal Of Organization As Per Document"
                required
                error={errors.sealOfOrganization}
              >
                <TalliedRadio
                  name="seal"
                  value={values.sealOfOrganization}
                  onChange={(v) => set("sealOfOrganization", v)}
                />
              </Field>
              <Field
                label="Signature Of Issuing Authority As Per Document"
                required
                error={errors.signatureOfAuthority}
              >
                <TalliedRadio
                  name="sig"
                  value={values.signatureOfAuthority}
                  onChange={(v) => set("signatureOfAuthority", v)}
                />
              </Field>
              <Field
                label="Date & Amount On Salary Slip / Pay Slip / Salary Certificate"
                required
                error={errors.salarySlipDateAmount}
              >
                <TalliedRadio
                  name="salary"
                  value={values.salarySlipDateAmount}
                  onChange={(v) => set("salarySlipDateAmount", v)}
                />
              </Field>
              <Field
                label="Applicant Office Address Correct"
                required
                error={errors.officeAddressCorrect}
              >
                <TalliedRadio
                  name="office"
                  value={values.officeAddressCorrect}
                  onChange={(v) => set("officeAddressCorrect", v)}
                />
              </Field>
            </div>
          </Section>

          {/* Section 2 - Live Summary */}
          <Section
            title="Documents Verification Summary"
            subtitle="Live summary based on current document verification entries."
          >
            <div className="rounded-xl border border-border bg-background/40 p-4 sm:p-5 space-y-3">
              {summary.results.map((item) => (
                <SummaryRow
                  key={item.label}
                  label={item.label}
                  value={item.value}
                />
              ))}

              <div className="pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Overall Status</span>
                  {summary.overallStatus === "positive" ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" />
                      Positive
                    </span>
                  ) : summary.overallStatus === "review" ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                      <AlertTriangle className="h-4 w-4" />
                      Requires Review
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                      <CircleDashed className="h-4 w-4" />
                      Pending
                    </span>
                  )}
                </div>
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
        </>)}
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

function TalliedRadio({
  name,
  value,
  onChange,
}: {
  name: string;
  value: VerificationValue | "";
  onChange: (v: VerificationValue) => void;
}) {
  return (
    <RadioGroup
      className="flex flex-wrap gap-4 pt-1"
      value={value}
      onValueChange={(v) => onChange(v as VerificationValue)}
    >
      <label className="inline-flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="tallied" id={`${name}-tallied`} />
        <span className="text-sm">Tallied</span>
      </label>
      <label className="inline-flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="not_tallied" id={`${name}-not_tallied`} />
        <span className="text-sm">Not Tallied</span>
      </label>
      <label className="inline-flex items-center gap-2 cursor-pointer">
        <RadioGroupItem value="not_applicable" id={`${name}-na`} />
        <span className="text-sm">Not Applicable</span>
      </label>
    </RadioGroup>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: VerificationValue | "";
}) {
  const isTallied = value === "tallied";
  const isNotTallied = value === "not_tallied";
  const isNA = value === "not_applicable";

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      {isTallied ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Tallied
        </span>
      ) : isNotTallied ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
          <XCircle className="h-3.5 w-3.5" />
          Not Tallied
        </span>
      ) : isNA ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          Not Applicable
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <CircleDashed className="h-3.5 w-3.5" />
          Pending
        </span>
      )}
    </div>
  );
}
