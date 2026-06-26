import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ArrowLeft,
  Save,
  ArrowRight,
  AlertCircle,
  ClipboardList,
  CalendarIcon,
  User,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { uploadSignature } from "@/lib/uploads.functions";
import { useCaseSync } from "@/lib/case-sync-provider";
import { humanizeUploadError } from "@/lib/upload-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FillTestDataButton } from "@/components/dev/fill-test-data-button";
import { cn } from "@/lib/utils";
import {
  labelApplicants,
  nextModuleRoute,
  useVerificationStore,
  type GeneralDetails,
} from "@/lib/verification-store";
import { ModuleTopBar } from "@/components/module-top-bar";

export const Route = createFileRoute("/_app/verifications/general")({
  head: () => ({ meta: [{ title: "General Details — VerifyPro" }] }),
  component: GeneralDetailsPage,
});

const qualifications = [
  "10th Pass",
  "12th Pass",
  "Diploma",
  "Graduate",
  "Post Graduate",
  "Doctorate",
  "Professional Degree",
  "Other",
];

const employmentTypes = [
  "Salaried",
  "Business",
  "Self Employed",
  "Government Employee",
  "Other",
];

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_RE = /^\d{12}$/;

const todayISO = () => format(new Date(), "yyyy-MM-dd");

const testData: GeneralDetails = {
  borrowerName: "Ravi Kumar",
  fatherHusbandName: "Suresh Kumar",
  gender: "male",
  residentStatus: "resident",
  panNumber: "ABCDE1234F",
  aadhaarNumber: "123412341234",
  dateOfBirth: "1995-08-15",
  qualification: "Graduate",
  maritalStatus: "married",
  employmentType: "Salaried",
  udinNumber: "26222863ABCDEF0001",
  dateOfVerification: todayISO(),
  dateOfReportSubmission: todayISO(),
  caName: "PARVEZ MOHAMMED",
  caSignatureDataUrl: "",
  caSignaturePath: "",
};

type Errors = Partial<Record<keyof GeneralDetails, string>>;

const empty: GeneralDetails = {
  borrowerName: "",
  fatherHusbandName: "",
  gender: "",
  residentStatus: "",
  panNumber: "",
  aadhaarNumber: "",
  dateOfBirth: "",
  qualification: "",
  maritalStatus: "",
  employmentType: "",
  udinNumber: "",
  dateOfVerification: "",
  dateOfReportSubmission: "",
  caName: "",
  caSignatureDataUrl: "",
  caSignaturePath: "",
};

function GeneralDetailsPage() {
  const navigate = useNavigate();
  const activeCaseId = useVerificationStore((s) => s.activeCaseId);
  const isHydrated = useVerificationStore((s) => s.isHydrated);
  const applicants = useVerificationStore((s) => s.applicants);
  const activeId = useVerificationStore((s) => s.activeApplicantId);
  const uploadSig = useServerFn(uploadSignature);
  const { flushCase } = useCaseSync();
  const saved = useVerificationStore(
    (s) => s.modules[activeId]?.general?.general as Partial<GeneralDetails> | undefined,
  );
  const saveGeneral = useVerificationStore((s) => s.saveGeneral);

  const labeled = useMemo(() => labelApplicants(applicants), [applicants]);
  const activeEntry = labeled.find((a) => a.id === activeId);
  const activeLabel = activeEntry?.label ?? "Applicant";
  const isPrimary = !!activeEntry?.isPrimary;

  const withReportDefaults = (s?: Partial<GeneralDetails>): GeneralDetails => ({
    ...empty,
    udinNumber: "26222863",
    caName: "PARVEZ MOHAMMED",
    dateOfVerification: todayISO(),
    dateOfReportSubmission: todayISO(),
    ...(s ?? {}),
  });

  const [values, setValues] = useState<GeneralDetails>(() => withReportDefaults(saved));
  const [errors, setErrors] = useState<Errors>({});
  const [uploadingSig, setUploadingSig] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = uploadingSig || saving;

  // Redirect to drafts if we end up here without an active case after hydration.
  useEffect(() => {
    if (isHydrated && !activeCaseId) {
      console.log("[activeCaseId] general:no-active-after-hydrate → /drafts");
      navigate({ to: "/verifications/drafts" });
    }
  }, [isHydrated, activeCaseId, navigate]);

  // Reload values when active applicant changes
  useEffect(() => {
    setValues(withReportDefaults(saved));
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);


  const set = <K extends keyof GeneralDetails>(key: K, val: GeneralDetails[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!values.borrowerName.trim()) e.borrowerName = "Name of Borrower is required";
    if (!values.fatherHusbandName.trim())
      e.fatherHusbandName = "Father / Husband Name is required";
    if (!values.gender) e.gender = "Please select gender";
    if (!values.residentStatus) e.residentStatus = "Please select resident status";
    if (!values.panNumber.trim()) e.panNumber = "PAN Number is required";
    else if (!PAN_RE.test(values.panNumber.toUpperCase()))
      e.panNumber = "Invalid PAN. Format: ABCDE1234F";
    if (!values.aadhaarNumber.trim()) e.aadhaarNumber = "Aadhaar Number is required";
    else if (!AADHAAR_RE.test(values.aadhaarNumber))
      e.aadhaarNumber = "Aadhaar must be a 12-digit number";
    if (!values.dateOfBirth) e.dateOfBirth = "Date of Birth is required";
    if (!values.qualification) e.qualification = "Qualification is required";
    if (!values.maritalStatus) e.maritalStatus = "Please select marital status";
    if (!values.employmentType) e.employmentType = "Type of Employment is required";
    if (isPrimary) {
      if (!values.udinNumber.trim()) e.udinNumber = "UDIN Number is required";
      if (!values.caName.trim()) e.caName = "CA Name is required";
      if (!values.dateOfVerification) e.dateOfVerification = "Date of Verification is required";
      if (!values.dateOfReportSubmission)
        e.dateOfReportSubmission = "Date of Report Submission is required";
    }
    return e;
  };


  const handleFillTestData = () => {
    setValues({ ...testData });
    setErrors({});
    toast.info("Test data filled", { description: "All fields populated with sample data." });
  };

  const handleSaveDraft = async (): Promise<boolean> => {
    if (busy) return false;
    setSaving(true);
    const toastId = toast.loading("Saving Verification…");
    try {
      console.log("[general-save] draft start", { applicant: activeId });
      saveGeneral(activeId, { ...values, panNumber: values.panNumber.toUpperCase() }, "in_progress");
      if (activeCaseId) await flushCase(activeCaseId);
      console.log("[general-save] draft success");
      toast.success("Draft saved", { id: toastId, description: `General Details saved for ${activeLabel}.` });
      return true;
    } catch (err) {
      console.error("[general-save] draft failed", err);
      toast.error("Save failed", { id: toastId, description: humanizeUploadError(err) });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveContinue = async () => {
    if (busy) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix the errors before continuing.");
      return;
    }
    setSaving(true);
    const toastId = toast.loading("Saving Verification…");
    try {
      console.log("[general-save] continue start", { applicant: activeId });
      saveGeneral(activeId, { ...values, panNumber: values.panNumber.toUpperCase() }, "completed");
      if (activeCaseId) await flushCase(activeCaseId);
      console.log("[general-save] continue success");
      toast.success("General Details completed", {
        id: toastId,
        description: `${activeLabel}'s general details have been saved.`,
      });
      const __st = useVerificationStore.getState();
      const next = nextModuleRoute(__st.modules[activeId], "general", __st.activeCaseId ? __st.cases[__st.activeCaseId]?.loanType : undefined);
      navigate({ to: next });
    } catch (err) {
      console.error("[general-save] continue failed", err);
      toast.error("Save failed", { id: toastId, description: humanizeUploadError(err) });
    } finally {
      setSaving(false);
    }
  };

  const dob = values.dateOfBirth ? new Date(values.dateOfBirth) : undefined;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <ModuleTopBar />

      <div className="rounded-2xl border border-border bg-card">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 border-b border-border">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <ClipboardList className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">General Details</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Capture the basic profile information of the applicant.
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
        <div className="p-5 sm:p-6 grid gap-5 sm:grid-cols-2">
          <Field label="Name of Borrower" required error={errors.borrowerName}>
            <Input
              className={cn("h-11", errors.borrowerName && "border-destructive")}
              placeholder="Full name as on PAN"
              value={values.borrowerName}
              onChange={(e) => set("borrowerName", e.target.value)}
              maxLength={100}
            />
          </Field>

          <Field label="Father / Husband Name" required error={errors.fatherHusbandName}>
            <Input
              className={cn("h-11", errors.fatherHusbandName && "border-destructive")}
              placeholder="Full name"
              value={values.fatherHusbandName}
              onChange={(e) => set("fatherHusbandName", e.target.value)}
              maxLength={100}
            />
          </Field>

          <Field label="Gender" required error={errors.gender}>
            <RadioGroup
              className="flex flex-wrap gap-4 pt-1"
              value={values.gender}
              onValueChange={(v) => set("gender", v as GeneralDetails["gender"])}
            >
              <RadioOption value="male" label="Male" />
              <RadioOption value="female" label="Female" />
              <RadioOption value="other" label="Other" />
            </RadioGroup>
          </Field>

          <Field label="Resident Status" required error={errors.residentStatus}>
            <RadioGroup
              className="flex flex-wrap gap-4 pt-1"
              value={values.residentStatus}
              onValueChange={(v) => set("residentStatus", v as GeneralDetails["residentStatus"])}
            >
              <RadioOption value="resident" label="Resident" />
              <RadioOption value="non_resident" label="Non Resident" />
            </RadioGroup>
          </Field>

          <Field label="PAN Number" required error={errors.panNumber}>
            <Input
              className={cn("h-11 uppercase tracking-wider font-mono", errors.panNumber && "border-destructive")}
              placeholder="ABCDE1234F"
              value={values.panNumber}
              onChange={(e) => set("panNumber", e.target.value.toUpperCase())}
              maxLength={10}
            />
          </Field>

          <Field label="Aadhaar Number" required error={errors.aadhaarNumber}>
            <Input
              className={cn("h-11 font-mono", errors.aadhaarNumber && "border-destructive")}
              placeholder="12-digit Aadhaar number"
              inputMode="numeric"
              value={values.aadhaarNumber}
              onChange={(e) => set("aadhaarNumber", e.target.value.replace(/\D/g, "").slice(0, 12))}
              maxLength={12}
            />
          </Field>

          <Field label="Date of Birth" required error={errors.dateOfBirth}>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-11 w-full justify-start text-left font-normal",
                    !dob && "text-muted-foreground",
                    errors.dateOfBirth && "border-destructive",
                  )}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {dob ? format(dob, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dob}
                  onSelect={(d) =>
                    set("dateOfBirth", d ? format(d, "yyyy-MM-dd") : "")
                  }
                  captionLayout="dropdown"
                  fromYear={1940}
                  toYear={new Date().getFullYear()}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </Field>

          <Field label="Qualification" required error={errors.qualification}>
            <Select
              value={values.qualification}
              onValueChange={(v) => set("qualification", v)}
            >
              <SelectTrigger className={cn("h-11", errors.qualification && "border-destructive")}>
                <SelectValue placeholder="Select qualification" />
              </SelectTrigger>
              <SelectContent>
                {qualifications.map((q) => (
                  <SelectItem key={q} value={q}>{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Marital Status" required error={errors.maritalStatus}>
            <RadioGroup
              className="flex flex-wrap gap-4 pt-1"
              value={values.maritalStatus}
              onValueChange={(v) => set("maritalStatus", v as GeneralDetails["maritalStatus"])}
            >
              <RadioOption value="single" label="Single" />
              <RadioOption value="married" label="Married" />
            </RadioGroup>
          </Field>

          <Field label="Type of Employment" required error={errors.employmentType}>
            <Select
              value={values.employmentType}
              onValueChange={(v) => set("employmentType", v)}
            >
              <SelectTrigger className={cn("h-11", errors.employmentType && "border-destructive")}>
                <SelectValue placeholder="Select employment type" />
              </SelectTrigger>
              <SelectContent>
                {employmentTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {/* Report Information — only for primary applicant */}
        {isPrimary && (
        <div className="px-5 sm:px-6 pb-5 sm:pb-6">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold tracking-tight">Report Information</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Used on the cover page, certificate page and report header.
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {activeCaseId ?? "—"}
              </Badge>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Verification Number">
                <Input
                  className="h-11 font-mono bg-muted/40"
                  value={activeCaseId ?? ""}
                  readOnly
                />
              </Field>
              <Field label="UDIN Number" required error={errors.udinNumber}>
                <Input
                  className={cn("h-11 font-mono tracking-wider", errors.udinNumber && "border-destructive")}
                  placeholder="26222863XXXXXX0000"
                  value={values.udinNumber}
                  onChange={(e) => set("udinNumber", e.target.value.toUpperCase())}
                  maxLength={18}
                />
              </Field>
              <Field label="Date of Verification" required error={errors.dateOfVerification}>
                <Input
                  type="date"
                  className={cn("h-11", errors.dateOfVerification && "border-destructive")}
                  value={values.dateOfVerification}
                  onChange={(e) => set("dateOfVerification", e.target.value)}
                />
              </Field>
              <Field label="Date of Report Submission" required error={errors.dateOfReportSubmission}>
                <Input
                  type="date"
                  className={cn("h-11", errors.dateOfReportSubmission && "border-destructive")}
                  value={values.dateOfReportSubmission}
                  onChange={(e) => set("dateOfReportSubmission", e.target.value)}
                />
              </Field>
              <Field label="CA Name" required error={errors.caName}>
                <Input
                  className={cn("h-11", errors.caName && "border-destructive")}
                  placeholder="PARVEZ MOHAMMED"
                  value={values.caName}
                  onChange={(e) => set("caName", e.target.value)}
                  maxLength={100}
                />
              </Field>
              <Field label="CA Digital Signature (image)">
                <div className="flex items-center gap-3">
                  {values.caSignatureDataUrl ? (
                    <img
                      src={values.caSignatureDataUrl}
                      alt="CA Signature"
                      className="h-11 w-24 object-contain rounded border border-border bg-white"
                    />
                  ) : (
                    <div className="h-11 w-24 grid place-items-center rounded border border-dashed border-border text-[10px] text-muted-foreground">
                      No signature
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="h-11 cursor-pointer"
                    disabled={busy}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      if (!activeCaseId) {
                        toast.error("No active case");
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("File too large", {
                          description: "Signature exceeds 5 MB limit.",
                        });
                        return;
                      }
                      setUploadingSig(true);
                      const toastId = toast.loading("Uploading File…", {
                        description: file.name,
                      });
                      console.log("[signature-upload] start", {
                        caseNumber: activeCaseId,
                        name: file.name,
                        size: file.size,
                        type: file.type,
                      });
                      try {
                        // Ensure the case row exists in the cloud before upload.
                        try {
                          await flushCase(activeCaseId);
                        } catch (err) {
                          console.error("[signature-upload] flushCase failed", err);
                          toast.error("Could not sync case before upload", {
                            id: toastId,
                            description: humanizeUploadError(err),
                          });
                          return;
                        }
                        const dataUrl = await new Promise<string>((res, rej) => {
                          const r = new FileReader();
                          r.onload = () => res(String(r.result ?? ""));
                          // Fix #3: FileReader.onerror receives a ProgressEvent
                          // (e.g. { isTrusted: true }) not an Error. Convert
                          // to a real Error so humanizeUploadError can read it.
                          r.onerror = () => {
                            const domErr = r.error;
                            rej(
                              new Error(
                                `Failed to read file "${file.name}"${domErr ? `: ${domErr.name} ${domErr.message}` : ""}`,
                              ),
                            );
                          };
                          r.onabort = () => rej(new Error(`File read aborted: ${file.name}`));
                          r.readAsDataURL(file);
                        });
                        const comma = dataUrl.indexOf(",");
                        const fileBase64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
                        const result = await uploadSig({
                          data: {
                            caseNumber: activeCaseId,
                            fileName: file.name,
                            mimeType: file.type,
                            sizeBytes: file.size,
                            fileBase64,
                          },
                        });
                        console.log("[signature-upload] success", { path: result.storagePath });
                        set("caSignaturePath", result.storagePath);
                        set("caSignatureDataUrl", result.signedUrl);
                        toast.success("Signature uploaded", { id: toastId });
                      } catch (err) {
                        console.error("[signature-upload] failed", err);
                        toast.error("Signature upload failed", {
                          id: toastId,
                          description: humanizeUploadError(err),
                        });
                      } finally {
                        setUploadingSig(false);
                      }
                    }}
                  />
                  {values.caSignatureDataUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-11 px-2 text-xs text-muted-foreground"
                      disabled={busy}
                      onClick={() => {
                        set("caSignatureDataUrl", "");
                        set("caSignaturePath", "");
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}

                </div>
              </Field>
            </div>
          </div>
        </div>
        )}





        {/* Footer */}
        <div className="module-action-bar px-3 sm:px-6 py-3 sm:py-4 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 bg-card sm:bg-muted/30 rounded-b-2xl mobile-actions">
          <p className="hidden sm:flex text-xs text-muted-foreground items-center gap-2">
            {uploadingSig && (
              <span className="inline-flex items-center gap-1.5 text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading File…
              </span>
            )}
            {saving && (
              <span className="inline-flex items-center gap-1.5 text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving Verification…
              </span>
            )}
            {!busy && "Status updates only after a successful Save & Continue."}
          </p>
          <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2 sm:justify-end">
            <Button variant="outline" className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0" onClick={handleSaveDraft} disabled={busy}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Draft
            </Button>
            <Button
              variant="outline"
              className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0"
              disabled={busy}
              onClick={async () => {
                const ok = await handleSaveDraft();
                if (ok !== false) navigate({ to: "/verifications/workspace" });
              }}
            >
              Save &amp; Return
            </Button>
            <Button className="h-11 sm:h-10 text-xs sm:text-sm px-2 sm:px-4 min-w-0" onClick={handleSaveContinue} disabled={busy}>
              Save &amp; Continue
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

      </div>
    </div>
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
      <RadioGroupItem value={value} id={`r-${value}`} />
      <span className="text-sm">{label}</span>
    </label>
  );
}
