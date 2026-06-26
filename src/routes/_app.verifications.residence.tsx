import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Save,
  ArrowRight,
  AlertCircle,
  Home,
  MapPin,
  UserSquare2,
  MapPinned,
  Activity,
  FileText,
  Lock,
  AlertTriangle,
  ClipboardCheck,
  User,
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
  labelApplicants,
  nextModuleRoute,
  useVerificationStore,
  type ResidenceDetails,
  type GeneralDetails,
} from "@/lib/verification-store";
import { ModuleTopBar } from "@/components/module-top-bar";
import { generateResidenceNotes } from "@/lib/notes.functions";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_app/verifications/residence")({
  head: () => ({ meta: [{ title: "Residence Verification — VerifyPro" }] }),
  component: ResidenceVerificationPage,
});

const natureOptions = [
  "Owned",
  "Rental",
  "Family Owned",
  "Lease",
  "Paying Guest",
  "Company Quarters",
  "Others",
];
const typeOptions = ["Flat", "Independent House", "Multi-Tenanted House"];
const relationOptions = ["Family Member", "Neighbor", "Landlord", "Others"];
const localityOptions = ["Residential", "Commercial", "Project Area", "Security Area"];
const livingStandardOptions = ["Low Class", "Middle Class", "Upper Middle Class", "High Class"];
const accessibilityOptions = ["Easy", "Difficult", "Very Difficult"];

const empty: ResidenceDetails = {
  addressTallied: "",
  residenceLandmark: "",
  stayConfirmed: "",
  stayingSinceYears: "",
  namePlateSeen: "",
  namePlateMatch: "",
  natureOfResidence: "",
  typeOfResidence: "",
  contactPersonName: "",
  contactPersonAddress: "",
  contactPersonRelation: "",
  city: "",
  pincode: "",
  residencePhone: "",
  mobileNumber: "",
  typeOfLocality: "",
  localityLandmark: "",
  livingStandard: "",
  numberOfDependents: "",
  accessibility: "",
  givenAddress: "",
  presentAddress: "",
  houseLocked: "",
  nbApplicantStays: "",
  nbApproxAge: "",
  nbFamilyMembers: "",
  nbOccupation: "",
  nbStayingSince: "",
  reasonNotConfirmed: "",
  untraceableReason: "",
  actualOccupantDetails: "",
  visitDateTime: "",
  verifierRemarks: "",
  supervisorRemarks: "",
  negativeRemarks: "",
  notes: "",
};

const testData: ResidenceDetails = {
  addressTallied: "yes",
  residenceLandmark: "Opposite St. Mary's School",
  stayConfirmed: "yes",
  stayingSinceYears: "6",
  namePlateSeen: "yes",
  namePlateMatch: "yes",
  natureOfResidence: "Owned",
  typeOfResidence: "Flat",
  contactPersonName: "Anita Kumar",
  contactPersonAddress: "Flat 402, Sunrise Apartments, Andheri East, Mumbai",
  contactPersonRelation: "Family Member",
  city: "Mumbai",
  pincode: "400069",
  residencePhone: "02226712345",
  mobileNumber: "9876543210",
  typeOfLocality: "Residential",
  localityLandmark: "Near Metro Station, Andheri East",
  livingStandard: "Middle Class",
  numberOfDependents: "3",
  accessibility: "Easy",
  givenAddress: "Flat 402, Sunrise Apartments, MG Road, Andheri East, Mumbai - 400069",
  presentAddress: "Flat 402, Sunrise Apartments, MG Road, Andheri East, Mumbai - 400069",
  houseLocked: "no",
  nbApplicantStays: "",
  nbApproxAge: "",
  nbFamilyMembers: "",
  nbOccupation: "",
  nbStayingSince: "",
  reasonNotConfirmed: "",
  untraceableReason: "",
  actualOccupantDetails: "",
  visitDateTime: new Date().toISOString().slice(0, 16),
  verifierRemarks: "Applicant present at the address. Documents verified successfully.",
  supervisorRemarks: "Verification looks clean. Approved.",
  negativeRemarks: "",
  notes: "",
};

type Errors = Partial<Record<keyof ResidenceDetails, string>>;

function ResidenceVerificationPage() {
  const navigate = useNavigate();
  const applicants = useVerificationStore((s) => s.applicants);
  const activeId = useVerificationStore((s) => s.activeApplicantId);
  const saved = useVerificationStore(
    (s) =>
      (s.modules[activeId]?.residence as unknown as { residence?: Partial<ResidenceDetails> })
        ?.residence,
  );
  const borrowerName = useVerificationStore(
    (s) =>
      ((s.modules[activeId]?.general as unknown as { general?: Partial<GeneralDetails> })?.general
        ?.borrowerName as string) ?? "",
  );
  const saveResidence = useVerificationStore((s) => s.saveResidence);

  const labeled = useMemo(() => labelApplicants(applicants), [applicants]);
  const activeLabel = labeled.find((a) => a.id === activeId)?.label ?? "Applicant";

  const [values, setValues] = useState<ResidenceDetails>({ ...empty, ...saved });
  const [errors, setErrors] = useState<Errors>({});
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setValues({ ...empty, ...(saved ?? {}) });
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const set = <K extends keyof ResidenceDetails>(key: K, val: ResidenceDetails[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!values.addressTallied) e.addressTallied = "Required";
    if (!values.residenceLandmark.trim()) e.residenceLandmark = "Required";
    if (!values.stayConfirmed) e.stayConfirmed = "Required";
    if (!values.natureOfResidence) e.natureOfResidence = "Required";
    if (!values.typeOfResidence) e.typeOfResidence = "Required";
    if (!values.city.trim()) e.city = "Required";
    if (!values.mobileNumber.trim()) e.mobileNumber = "Required";
    else if (!/^\d{10}$/.test(values.mobileNumber))
      e.mobileNumber = "Mobile must be 10 digits";
    if (!values.livingStandard) e.livingStandard = "Required";
    if (!values.givenAddress.trim()) e.givenAddress = "Required";
    if (!values.presentAddress.trim()) e.presentAddress = "Required";
    if (!values.visitDateTime) e.visitDateTime = "Required";
    return e;
  };

  const handleFillTestData = () => {
    setValues({ ...testData });
    setErrors({});
    toast.info("Test data filled", { description: "Residence verification populated." });
  };

  const handleSaveDraft = () => {
    saveResidence(activeId, values, "in_progress");
    toast.success("Draft saved", { description: `Residence saved for ${activeLabel}.` });
  };

  const handleGenerateNotes = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await generateResidenceNotes({
        data: {
          applicantLabel: activeLabel,
          borrowerName,
          residence: values as unknown as Record<string, unknown>,
        },
      });
      setValues((v) => ({ ...v, notes: res.notes }));
      toast.success("Notes generated", { description: "Review and edit before saving." });
    } catch (err) {
      console.error(err);
      toast.error("Could not generate notes", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveContinue = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix the errors before continuing.");
      return;
    }
    saveResidence(activeId, values, "completed");
    toast.success("Residence verification completed", {
      description: `${activeLabel}'s residence has been verified.`,
    });
    const __st = useVerificationStore.getState();
    const __next = nextModuleRoute(__st.modules[activeId], "residence", __st.activeCaseId ? __st.cases[__st.activeCaseId]?.loanType : undefined);
    navigate({ to: __next });
  };

  const showStayingSince = values.stayConfirmed === "yes";
  const showNamePlateMatch = values.namePlateSeen === "yes";
  const showNeighbourSection = values.houseLocked === "yes";
  const showMismatchSection = values.addressTallied === "no";

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <ModuleTopBar />

      <div className="rounded-2xl border border-border bg-card">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 border-b border-border">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Home className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
              Residence Verification
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verify the residential address, occupancy and locality details.
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

        <div className="p-5 sm:p-6 space-y-6">
          {/* Section 1 */}
          <Section icon={MapPin} title="Address Verification" subtitle="Confirm tally and stay at given address">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Present Residence Address Tallied" required error={errors.addressTallied}>
                <YesNo
                  value={values.addressTallied}
                  onChange={(v) => set("addressTallied", v)}
                  name="addressTallied"
                />
              </Field>
              <Field label="Residence Landmark" required error={errors.residenceLandmark}>
                <Input
                  className={cn("h-11", errors.residenceLandmark && "border-destructive")}
                  placeholder="Nearby landmark"
                  value={values.residenceLandmark}
                  onChange={(e) => set("residenceLandmark", e.target.value)}
                />
              </Field>
              <Field label="Stay Confirmed" required error={errors.stayConfirmed}>
                <YesNo
                  value={values.stayConfirmed}
                  onChange={(v) => set("stayConfirmed", v)}
                  name="stayConfirmed"
                />
              </Field>
              {showStayingSince && (
                <Field label="Staying Since (Years)">
                  <Input
                    className="h-11"
                    placeholder="e.g. 5"
                    inputMode="numeric"
                    value={values.stayingSinceYears}
                    onChange={(e) =>
                      set("stayingSinceYears", e.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                  />
                </Field>
              )}
              <Field label="Name Plate Seen In Building">
                <YesNo
                  value={values.namePlateSeen}
                  onChange={(v) => set("namePlateSeen", v)}
                  name="namePlateSeen"
                />
              </Field>
              {showNamePlateMatch && (
                <Field label="Does Name On Plate Match?">
                  <YesNo
                    value={values.namePlateMatch}
                    onChange={(v) => set("namePlateMatch", v)}
                    name="namePlateMatch"
                  />
                </Field>
              )}
            </div>
          </Section>

          {/* Section 2 */}
          <Section icon={Home} title="Residence Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nature of Residence" required error={errors.natureOfResidence}>
                <SelectField
                  value={values.natureOfResidence}
                  onValueChange={(v) => set("natureOfResidence", v)}
                  options={natureOptions}
                  placeholder="Select nature"
                  error={!!errors.natureOfResidence}
                />
              </Field>
              <Field label="Type of Residence" required error={errors.typeOfResidence}>
                <SelectField
                  value={values.typeOfResidence}
                  onValueChange={(v) => set("typeOfResidence", v)}
                  options={typeOptions}
                  placeholder="Select type"
                  error={!!errors.typeOfResidence}
                />
              </Field>
            </div>
          </Section>

          {/* Section 3 */}
          <Section icon={UserSquare2} title="Contact Person">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name of Person Contacted">
                <Input
                  className="h-11"
                  value={values.contactPersonName}
                  onChange={(e) => set("contactPersonName", e.target.value)}
                />
              </Field>
              <Field label="Relation with Applicant">
                <SelectField
                  value={values.contactPersonRelation}
                  onValueChange={(v) => set("contactPersonRelation", v)}
                  options={relationOptions}
                  placeholder="Select relation"
                />
              </Field>
              <Field label="Address of Person Contacted" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={values.contactPersonAddress}
                  onChange={(e) => set("contactPersonAddress", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {/* Section 4 */}
          <Section icon={MapPinned} title="Location Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="City" required error={errors.city}>
                <Input
                  className={cn("h-11", errors.city && "border-destructive")}
                  value={values.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </Field>
              <Field label="Pincode">
                <Input
                  className="h-11 font-mono"
                  inputMode="numeric"
                  value={values.pincode}
                  onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </Field>
              <Field label="Residence Phone Number">
                <Input
                  className="h-11 font-mono"
                  inputMode="tel"
                  value={values.residencePhone}
                  onChange={(e) => set("residencePhone", e.target.value)}
                />
              </Field>
              <Field label="Mobile Number" required error={errors.mobileNumber}>
                <Input
                  className={cn("h-11 font-mono", errors.mobileNumber && "border-destructive")}
                  inputMode="numeric"
                  placeholder="10-digit mobile"
                  value={values.mobileNumber}
                  onChange={(e) =>
                    set("mobileNumber", e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                />
              </Field>
              <Field label="Type of Locality">
                <SelectField
                  value={values.typeOfLocality}
                  onValueChange={(v) => set("typeOfLocality", v)}
                  options={localityOptions}
                  placeholder="Select locality"
                />
              </Field>
              <Field label="Locality / Landmark">
                <Input
                  className="h-11"
                  value={values.localityLandmark}
                  onChange={(e) => set("localityLandmark", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {/* Section 5 */}
          <Section icon={Activity} title="Living Standards">
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="Living Standard Observed" required error={errors.livingStandard}>
                <SelectField
                  value={values.livingStandard}
                  onValueChange={(v) => set("livingStandard", v)}
                  options={livingStandardOptions}
                  placeholder="Select standard"
                  error={!!errors.livingStandard}
                />
              </Field>
              <Field label="Number of Dependents">
                <Input
                  className="h-11"
                  inputMode="numeric"
                  value={values.numberOfDependents}
                  onChange={(e) =>
                    set("numberOfDependents", e.target.value.replace(/\D/g, "").slice(0, 3))
                  }
                />
              </Field>
              <Field label="Accessibility of Address">
                <SelectField
                  value={values.accessibility}
                  onValueChange={(v) => set("accessibility", v)}
                  options={accessibilityOptions}
                  placeholder="Select accessibility"
                />
              </Field>
            </div>
          </Section>

          {/* Section 6 */}
          <Section icon={FileText} title="Address Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Given Address" required error={errors.givenAddress}>
                <Textarea
                  rows={3}
                  className={cn(errors.givenAddress && "border-destructive")}
                  value={values.givenAddress}
                  onChange={(e) => set("givenAddress", e.target.value)}
                />
              </Field>
              <Field label="Present Address" required error={errors.presentAddress}>
                <Textarea
                  rows={3}
                  className={cn(errors.presentAddress && "border-destructive")}
                  value={values.presentAddress}
                  onChange={(e) => set("presentAddress", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {/* Section 7 */}
          <Section icon={Lock} title="Neighbour Verification" subtitle="Required only if house was locked during visit">
            <Field label="House Locked During Visit?">
              <YesNo
                value={values.houseLocked}
                onChange={(v) => set("houseLocked", v)}
                name="houseLocked"
              />
            </Field>
            {showNeighbourSection && (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 rounded-xl bg-muted/40 border border-border/60 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <Field label="Does Applicant Stay Here">
                  <YesNo
                    value={values.nbApplicantStays}
                    onChange={(v) => set("nbApplicantStays", v)}
                    name="nbApplicantStays"
                  />
                </Field>
                <Field label="Approximate Age">
                  <Input
                    className="h-11"
                    inputMode="numeric"
                    value={values.nbApproxAge}
                    onChange={(e) =>
                      set("nbApproxAge", e.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                  />
                </Field>
                <Field label="Number of Family Members">
                  <Input
                    className="h-11"
                    inputMode="numeric"
                    value={values.nbFamilyMembers}
                    onChange={(e) =>
                      set("nbFamilyMembers", e.target.value.replace(/\D/g, "").slice(0, 3))
                    }
                  />
                </Field>
                <Field label="Occupation">
                  <Input
                    className="h-11"
                    value={values.nbOccupation}
                    onChange={(e) => set("nbOccupation", e.target.value)}
                  />
                </Field>
                <Field label="Staying Since">
                  <Input
                    className="h-11"
                    placeholder="e.g. 4 years"
                    value={values.nbStayingSince}
                    onChange={(e) => set("nbStayingSince", e.target.value)}
                  />
                </Field>
              </div>
            )}
          </Section>

          {/* Section 8 */}
          {showMismatchSection && (
            <Section
              icon={AlertTriangle}
              title="Address Mismatch Investigation"
              subtitle="Address Tallied = No"
              tone="warn"
            >
              <div className="grid gap-5 sm:grid-cols-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Field label="Reason for Address Not Confirmed" className="sm:col-span-2">
                  <Textarea
                    rows={2}
                    value={values.reasonNotConfirmed}
                    onChange={(e) => set("reasonNotConfirmed", e.target.value)}
                  />
                </Field>
                <Field label="If Untraceable, Reason" className="sm:col-span-2">
                  <Textarea
                    rows={2}
                    value={values.untraceableReason}
                    onChange={(e) => set("untraceableReason", e.target.value)}
                  />
                </Field>
                <Field label="Actual Owner / Occupant Details" className="sm:col-span-2">
                  <Textarea
                    rows={2}
                    value={values.actualOccupantDetails}
                    onChange={(e) => set("actualOccupantDetails", e.target.value)}
                  />
                </Field>
              </div>
            </Section>
          )}

          {/* Section 9 */}
          <Section icon={ClipboardCheck} title="Verification Outcome">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Date & Time of Visit" required error={errors.visitDateTime}>
                <Input
                  type="datetime-local"
                  className={cn("h-11", errors.visitDateTime && "border-destructive")}
                  value={values.visitDateTime}
                  onChange={(e) => set("visitDateTime", e.target.value)}
                />
              </Field>
              <Field label="Verifier Remarks" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={values.verifierRemarks}
                  onChange={(e) => set("verifierRemarks", e.target.value)}
                />
              </Field>
              <Field label="Supervisor Remarks" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={values.supervisorRemarks}
                  onChange={(e) => set("supervisorRemarks", e.target.value)}
                />
              </Field>
              <Field label="Negative Remarks" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  placeholder="Any red flags observed during the visit"
                  value={values.negativeRemarks}
                  onChange={(e) => set("negativeRemarks", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {/* Residence Verification Notes */}
          <Section
            icon={FileText}
            title="Residence Verification Notes"
            subtitle="AI-drafted observation — review and edit before saving"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={handleGenerateNotes}
                  disabled={generating}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {values.notes ? "Regenerate Notes" : "Generate Notes"}
                </Button>
                {values.notes && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9"
                    onClick={() => set("notes", "")}
                  >
                    Clear
                  </Button>
                )}
                <p className="text-[11px] text-muted-foreground">
                  These notes appear verbatim in the final report.
                </p>
              </div>
              <Textarea
                rows={6}
                placeholder="Click Generate Notes to draft a professional observation, then edit as needed."
                value={values.notes}
                onChange={(e) => set("notes", e.target.value)}
              />
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
  icon: Icon,
  title,
  subtitle,
  tone,
  children,
}: {
  icon: typeof Home;
  title: string;
  subtitle?: string;
  tone?: "default" | "warn";
  children: React.ReactNode;
}) {
  const warn = tone === "warn";
  return (
    <section
      className={cn(
        "rounded-xl border bg-background p-5",
        warn ? "border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10" : "border-border",
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className={cn(
            "grid h-9 w-9 place-items-center rounded-lg shrink-0",
            warn ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
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
    <div className={cn("space-y-2", className)}>
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

function SelectField({
  value,
  onValueChange,
  options,
  placeholder,
  error,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: string[];
  placeholder: string;
  error?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn("h-11", error && "border-destructive")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
