import { useNavigate, Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Save, ArrowRight, Building2, Banknote, FileType, AlertCircle, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVerificationStore } from "@/lib/verification-store";
import { toast } from "sonner";


export const Route = createFileRoute("/_app/verifications/new")({
  head: () => ({ meta: [{ title: "New Verification — VerifyPro" }] }),
  component: NewVerificationPage,
});

const loanTypes = [
  "Home Loan",
  "Mortgage Loan",
  "Business Loan",
  "Personal Loan",
  "Vehicle Loan",
  "Education Loan",
];

const steps = [
  { n: 1, label: "Case Details", active: true },
  { n: 2, label: "Applicant Info" },
  { n: 3, label: "Verification Modules" },
  { n: 4, label: "Documents" },
  { n: 5, label: "Review & Submit" },
];

type Errors = {
  loanType?: string;
  bankName?: string;
  branchName?: string;
  loanAmount?: string;
};

function NewVerificationPage() {
  const navigate = useNavigate();
  const createCase = useVerificationStore((s) => s.createCase);
  const [loanType, setLoanType] = useState("");
  const [bankName, setBankName] = useState("Bank of India");
  const [branchName, setBranchName] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  const validate = (): Errors => {
    const e: Errors = {};
    if (!loanType) e.loanType = "Loan Type is required";
    if (!bankName.trim()) e.bankName = "Bank Name is required";
    if (!branchName.trim()) e.branchName = "Branch Name is required";
    if (!loanAmount || Number(loanAmount) <= 0)
      e.loanAmount = "Loan Amount must be greater than 0";
    return e;
  };

  const handleContinue = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length === 0) {
      const id = createCase({ loanType, bankName: bankName.trim(), branchName: branchName.trim(), loanAmount });
      toast.success("Verification case created", { description: `Case ID: ${id}` });
      navigate({ to: "/verifications/general" });
    }
  };

  const handleSaveDraft = () => {
    if (!loanType && !branchName.trim() && !loanAmount) {
      toast.error("Enter at least one field to save a draft.");
      return;
    }
    const id = createCase({ loanType, bankName: bankName.trim(), branchName: branchName.trim(), loanAmount });
    toast.success("Draft saved", { description: `Case ID: ${id}` });
    navigate({ to: "/verifications/drafts" });
  };


  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/dashboard" className="hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">New Verification Case</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Provide the basic case details to initiate a new due diligence verification.
        </p>
      </div>

      {/* Stepper */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 overflow-x-auto">
        <ol className="flex items-center gap-2 min-w-max">
          {steps.map((s, i) => (
            <li key={s.n} className="flex items-center gap-2">
              <div
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
                  s.active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.n}
              </div>
              <span
                className={`text-xs font-medium ${
                  s.active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && <div className="w-8 h-px bg-border mx-1" />}
            </li>
          ))}
        </ol>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-border bg-card">
        <div className="p-5 sm:p-6 border-b border-border">
          <h2 className="text-base font-semibold">Case Details</h2>
          <p className="text-xs text-muted-foreground mt-1">
            All fields are required to proceed to the next step.
          </p>
        </div>

        <div className="p-5 sm:p-6 grid gap-5 sm:grid-cols-2">
          <Field
            icon={FileType}
            label="Loan Type"
            error={errors.loanType}
            input={
              <Select
                value={loanType}
                onValueChange={(v) => {
                  setLoanType(v);
                  setErrors((p) => ({ ...p, loanType: undefined }));
                }}
              >
                <SelectTrigger
                  className={`h-11 ${errors.loanType ? "border-destructive" : ""}`}
                >
                  <SelectValue placeholder="Select loan type" />
                </SelectTrigger>
                <SelectContent>
                  {loanTypes.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
          <Field
            icon={Landmark}
            label="Bank Name"
            error={errors.bankName}
            input={
              <Input
                placeholder="e.g. Bank of India"
                className={`h-11 ${errors.bankName ? "border-destructive" : ""}`}
                value={bankName}
                onChange={(e) => {
                  setBankName(e.target.value);
                  setErrors((p) => ({ ...p, bankName: undefined }));
                }}
              />
            }
          />
          <Field
            icon={Building2}
            label="Branch Name"
            error={errors.branchName}
            input={
              <Input
                placeholder="e.g. Mumbai - Andheri East"
                className={`h-11 ${errors.branchName ? "border-destructive" : ""}`}
                value={branchName}
                onChange={(e) => {
                  setBranchName(e.target.value);
                  setErrors((p) => ({ ...p, branchName: undefined }));
                }}
              />
            }
          />
          <Field
            icon={Banknote}
            label="Loan Amount"
            error={errors.loanAmount}
            input={
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  ₹
                </span>
                <Input
                  type="number"
                  placeholder="0.00"
                  className={`h-11 pl-7 ${errors.loanAmount ? "border-destructive" : ""}`}
                  value={loanAmount}
                  onChange={(e) => {
                    setLoanAmount(e.target.value);
                    setErrors((p) => ({ ...p, loanAmount: undefined }));
                  }}
                />
              </div>
            }
          />
        </div>

        <div className="module-action-bar px-3 sm:px-6 py-3 sm:py-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-card sm:bg-muted/30 rounded-b-2xl mobile-actions">
          <p className="text-xs text-muted-foreground">
            Save your draft to come back later, or continue to the workspace.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2 sm:justify-end">
            <Button variant="outline" className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0" onClick={handleSaveDraft}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>

            <Button className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0" onClick={handleContinue}>
              Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  input,
  error,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  input: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </Label>
      {input}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
