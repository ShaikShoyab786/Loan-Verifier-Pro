import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Save,
  ArrowRight,
  AlertCircle,
  Briefcase,
  Building2,
  Eye,
  FileCheck2,
  Info,
  CalendarClock,
  PhoneCall,
  ClipboardCheck,
  User,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  NON_EMPLOYED_CATEGORIES,
  labelApplicants,
  nextModuleRoute,
  useVerificationStore,
  type EmploymentCategory,
  type EmploymentDetails,
  type GeneralDetails,
} from "@/lib/verification-store";
import { ModuleTopBar } from "@/components/module-top-bar";
import { generateEmploymentNotes } from "@/lib/notes.functions";
import { Sparkles, Loader2, FileText } from "lucide-react";

export const Route = createFileRoute("/_app/verifications/employment")({
  head: () => ({ meta: [{ title: "Employment Verification — VerifyPro" }] }),
  component: EmploymentVerificationPage,
});

const categoryOptions: { value: EmploymentCategory; label: string }[] = [
  { value: "salaried", label: "Salaried Employee" },
  { value: "government", label: "Government Employee" },
  { value: "self_employed", label: "Self Employed" },
  { value: "business_owner", label: "Business Owner" },
  { value: "housewife", label: "Housewife" },
  { value: "retired", label: "Retired" },
  { value: "unemployed", label: "Unemployed" },
  { value: "student", label: "Student" },
];

const confirmedByOptions = ["Self", "HR", "Manager", "Supervisor", "Other"];
const ownershipOptions = ["Owned", "Rented", "Leased", "Family Owned", "Others"];
const firmTypeOptions = [
  "Public Limited",
  "Private Limited",
  "Partnership",
  "LLP",
  "Proprietor",
  "Other",
];
const natureOptions = ["Manufacturing", "Trading", "Servicing", "Other"];
const changeOptions = ["Stable", "Transfer Expected", "Resignation Expected", "Unknown"];
const proofOptions = [
  "Salary Slip",
  "ID Card",
  "Letter Head",
  "Old Envelope",
  "Bill Copy",
  "Visiting Card",
  "Appointment Letter",
  "IT Returns",
  "Other",
];

const empty: EmploymentDetails = {
  employmentCategory: "",
  businessName: "",
  businessAddress: "",
  addressConfirmedBy: "",
  landmark: "",
  officeOwnership: "",
  nameBoardSighted: "",
  nameBoardComments: "",
  proofsReceived: [],
  designation: "",
  yearOfEstablishment: "",
  typeOfFirm: "",
  natureOfBusiness: "",
  websiteEmail: "",
  sinceWhen: "",
  changeLikelihood: "",
  lineOfBusiness: "",
  telephoneNumber: "",
  termsOfEmployment: "",
  supervisorDetails: "",
  visitingCardObtained: "",
  verifierRemarks: "",
  supervisorRemarks: "",
  notes: "",
};

const naData = (cat: Exclude<EmploymentCategory, "">): EmploymentDetails => ({
  ...empty,
  employmentCategory: cat,
});

const testDataByCategory: Record<Exclude<EmploymentCategory, "">, EmploymentDetails> = {
  housewife: naData("housewife"),
  retired: naData("retired"),
  unemployed: naData("unemployed"),
  student: naData("student"),
  salaried: {
    employmentCategory: "salaried",
    businessName: "Infotech Solutions Pvt Ltd",
    businessAddress: "Tower B, 7th Floor, Hiranandani Business Park, Powai, Mumbai - 400076",
    addressConfirmedBy: "HR",
    landmark: "Opposite Powai Lake",
    officeOwnership: "Leased",
    nameBoardSighted: "yes",
    nameBoardComments: "",
    proofsReceived: ["Salary Slip", "ID Card", "Appointment Letter"],
    designation: "Senior Software Engineer",
    yearOfEstablishment: "",
    typeOfFirm: "Private Limited",
    natureOfBusiness: "Servicing",
    websiteEmail: "hr@infotechsolutions.com",
    sinceWhen: "Mar 2019",
    changeLikelihood: "Stable",
    lineOfBusiness: "",
    telephoneNumber: "02240501234",
    termsOfEmployment: "Permanent, Full Time",
    supervisorDetails: "Mr. Anil Mehta / Engineering Manager / 9820012345",
    visitingCardObtained: "yes",
    verifierRemarks: "Employee verified at workplace. HR confirmed tenure and designation.",
    supervisorRemarks: "Clean verification. No discrepancies observed.",
    notes: "",
  },
  government: {
    employmentCategory: "government",
    businessName: "Office of the District Collector, Pune",
    businessAddress: "Council Hall, Camp, Pune - 411001",
    addressConfirmedBy: "Supervisor",
    landmark: "Near Pune Railway Station",
    officeOwnership: "Owned",
    nameBoardSighted: "yes",
    nameBoardComments: "",
    proofsReceived: ["ID Card", "Letter Head", "Salary Slip"],
    designation: "Tehsildar",
    yearOfEstablishment: "",
    typeOfFirm: "Other",
    natureOfBusiness: "Other",
    websiteEmail: "collector.pune@gov.in",
    sinceWhen: "Aug 2012",
    changeLikelihood: "Transfer Expected",
    lineOfBusiness: "",
    telephoneNumber: "02026123456",
    termsOfEmployment: "Permanent Government Service",
    supervisorDetails: "Mr. R. Sharma / Deputy Collector / 9890011223",
    visitingCardObtained: "yes",
    verifierRemarks: "Verified at the district office. Service record confirmed by supervisor.",
    supervisorRemarks: "Government employee — verification complete.",
    notes: "",
  },
  self_employed: {
    employmentCategory: "self_employed",
    businessName: "Sharma Tax Consultants",
    businessAddress: "Shop 12, Karve Road, Erandwane, Pune - 411004",
    addressConfirmedBy: "Self",
    landmark: "Above HDFC Bank",
    officeOwnership: "Rented",
    nameBoardSighted: "yes",
    nameBoardComments: "",
    proofsReceived: ["Visiting Card", "IT Returns", "Bill Copy"],
    designation: "Practicing Chartered Accountant",
    yearOfEstablishment: "2014",
    typeOfFirm: "Proprietor",
    natureOfBusiness: "Servicing",
    websiteEmail: "contact@sharmatax.in",
    sinceWhen: "2014",
    changeLikelihood: "Stable",
    lineOfBusiness: "Taxation & Audit Consultancy",
    telephoneNumber: "02025671234",
    termsOfEmployment: "",
    supervisorDetails: "Self",
    visitingCardObtained: "yes",
    verifierRemarks: "Independent practice verified. Office and clientele observed at premises.",
    supervisorRemarks: "Self-employed verification cleared.",
    notes: "",
  },
  business_owner: {
    employmentCategory: "business_owner",
    businessName: "Samudra Loan Consultancy",
    businessAddress: "Ramayya Vedhi, Suryaraopeta, Kakinada - 533001",
    addressConfirmedBy: "Self",
    landmark: "Near Main Bus Stand",
    officeOwnership: "Owned",
    nameBoardSighted: "yes",
    nameBoardComments: "",
    proofsReceived: ["Visiting Card", "Letter Head", "Bill Copy"],
    designation: "Proprietor",
    yearOfEstablishment: "2017",
    typeOfFirm: "Proprietor",
    natureOfBusiness: "Servicing",
    websiteEmail: "samudraloans@gmail.com",
    sinceWhen: "2017",
    changeLikelihood: "Stable",
    lineOfBusiness: "Loan Consultancy & DSA Services",
    telephoneNumber: "8332022087",
    termsOfEmployment: "",
    supervisorDetails: "",
    visitingCardObtained: "yes",
    verifierRemarks: "Business premises observed. Operations active during visit.",
    supervisorRemarks: "Business verification successful.",
    notes: "",
  },
};

type Errors = Partial<Record<keyof EmploymentDetails, string>>;

function EmploymentVerificationPage() {
  const navigate = useNavigate();
  const applicants = useVerificationStore((s) => s.applicants);
  const activeId = useVerificationStore((s) => s.activeApplicantId);
  const saved = useVerificationStore(
    (s) =>
      (s.modules[activeId]?.employment as unknown as { employment?: Partial<EmploymentDetails> })
        ?.employment,
  );
  const saveEmployment = useVerificationStore((s) => s.saveEmployment);
  const borrowerName = useVerificationStore(
    (s) =>
      ((s.modules[activeId]?.general as unknown as { general?: Partial<GeneralDetails> })?.general
        ?.borrowerName as string) ?? "",
  );

  const labeled = useMemo(() => labelApplicants(applicants), [applicants]);
  const activeLabel = labeled.find((a) => a.id === activeId)?.label ?? "Applicant";

  const [values, setValues] = useState<EmploymentDetails>({ ...empty, ...saved });
  const [errors, setErrors] = useState<Errors>({});
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setValues({ ...empty, ...(saved ?? {}) });
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const set = <K extends keyof EmploymentDetails>(key: K, val: EmploymentDetails[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const toggleProof = (proof: string) => {
    setValues((v) => {
      const exists = v.proofsReceived.includes(proof);
      return {
        ...v,
        proofsReceived: exists
          ? v.proofsReceived.filter((p) => p !== proof)
          : [...v.proofsReceived, proof],
      };
    });
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!values.employmentCategory) e.employmentCategory = "Required";
    if (!values.businessName.trim()) e.businessName = "Required";
    if (!values.businessAddress.trim()) e.businessAddress = "Required";
    if (!values.designation.trim()) e.designation = "Required";
    if (!values.natureOfBusiness) e.natureOfBusiness = "Required";
    if (!values.sinceWhen.trim()) e.sinceWhen = "Required";
    if (!values.telephoneNumber.trim()) e.telephoneNumber = "Required";
    return e;
  };

  const handleFillTestData = () => {
    const cat: Exclude<EmploymentCategory, ""> =
      values.employmentCategory === "" ? "business_owner" : values.employmentCategory;
    setValues({ ...testDataByCategory[cat] });
    setErrors({});
    toast.info("Test data filled", {
      description: `Employment populated for ${categoryOptions.find((c) => c.value === cat)?.label}.`,
    });
  };

  const handleSaveDraft = () => {
    saveEmployment(activeId, values, "in_progress");
    toast.success("Draft saved", { description: `Employment saved for ${activeLabel}.` });
  };

  const handleGenerateNotes = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await generateEmploymentNotes({
        data: {
          applicantLabel: activeLabel,
          borrowerName,
          employment: values as unknown as Record<string, unknown>,
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

  const cat = values.employmentCategory;
  const isNotApplicable = NON_EMPLOYED_CATEGORIES.includes(cat);

  const handleSaveContinue = () => {
    if (isNotApplicable) {
      // Persist category and mark module completed; downstream isModuleApplicable
      // will exclude employment / salary / business / documents from progress.
      saveEmployment(activeId, { ...empty, employmentCategory: cat }, "completed");
      toast.success("Marked Not Applicable", {
        description: `Employment verification is not applicable for ${categoryOptions.find((c) => c.value === cat)?.label}.`,
      });
      const __st = useVerificationStore.getState();
      const __next = nextModuleRoute(__st.modules[activeId], "employment", __st.activeCaseId ? __st.cases[__st.activeCaseId]?.loanType : undefined);
      navigate({ to: __next });
      return;
    }
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix the errors before continuing.");
      return;
    }
    saveEmployment(activeId, values, "completed");
    toast.success("Employment verification completed", {
      description: `${activeLabel}'s employment has been verified.`,
    });
    const __st = useVerificationStore.getState();
    const __next = nextModuleRoute(__st.modules[activeId], "employment", __st.activeCaseId ? __st.cases[__st.activeCaseId]?.loanType : undefined);
    navigate({ to: __next });
  };

  const isBusinessOwner = cat === "business_owner";
  const isSelfEmployed = cat === "self_employed";
  const showTerms = !(isBusinessOwner || isSelfEmployed);
  const showSupervisor = !isBusinessOwner;
  const showYearOfEstablishment = isBusinessOwner || isSelfEmployed;
  const showLineOfBusiness = isSelfEmployed || isBusinessOwner;
  const showNameBoardComments = values.nameBoardSighted === "no";

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <ModuleTopBar />

      <div className="rounded-2xl border border-border bg-card">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 border-b border-border">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
              Employment / Business Verification
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verify the employer or business details, tenure and supporting proofs.
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
          <Section icon={Info} title="Employment Category" subtitle="Drives which fields are required below">
            <Field label="Employment Category" required error={errors.employmentCategory}>
              <Select
                value={values.employmentCategory}
                onValueChange={(v) => set("employmentCategory", v as EmploymentCategory)}
              >
                <SelectTrigger
                  className={cn("h-11", errors.employmentCategory && "border-destructive")}
                >
                  <SelectValue placeholder="Select employment category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </Section>

          {isNotApplicable && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground mb-3">
                <Ban className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold">Not Applicable</h3>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-md mx-auto">
                This section is not applicable for the selected employment category.
                Salary, Business Activity and Documents Verification will also be
                marked Not Applicable and excluded from progress.
              </p>
            </div>
          )}

          {!isNotApplicable && <>
          {/* Section 2 */}
          <Section icon={Building2} title="Business / Employer Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Name of Business Firm / Employer" required error={errors.businessName}>
                <Input
                  className={cn("h-11", errors.businessName && "border-destructive")}
                  value={values.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                />
              </Field>
              <Field label="Address Confirmed By">
                <SelectField
                  value={values.addressConfirmedBy}
                  onValueChange={(v) => set("addressConfirmedBy", v)}
                  options={confirmedByOptions}
                  placeholder="Select"
                />
              </Field>
              <Field
                label="Address of Business Firm / Employer"
                required
                error={errors.businessAddress}
                className="sm:col-span-2"
              >
                <Textarea
                  rows={3}
                  className={cn(errors.businessAddress && "border-destructive")}
                  value={values.businessAddress}
                  onChange={(e) => set("businessAddress", e.target.value)}
                />
              </Field>
              <Field label="Landmark / Locality" className="sm:col-span-2">
                <Input
                  className="h-11"
                  value={values.landmark}
                  onChange={(e) => set("landmark", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {/* Section 3 */}
          <Section icon={Eye} title="Office Verification">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Ownership of Office / Shop / Factory">
                <SelectField
                  value={values.officeOwnership}
                  onValueChange={(v) => set("officeOwnership", v)}
                  options={ownershipOptions}
                  placeholder="Select ownership"
                />
              </Field>
              <Field label="Name Board of Firm / Office Sighted">
                <YesNo
                  value={values.nameBoardSighted}
                  onChange={(v) => set("nameBoardSighted", v)}
                  name="nameBoardSighted"
                />
              </Field>
              {showNameBoardComments && (
                <Field label="Comments (Name Board Not Sighted)" className="sm:col-span-2">
                  <Textarea
                    rows={2}
                    value={values.nameBoardComments}
                    onChange={(e) => set("nameBoardComments", e.target.value)}
                  />
                </Field>
              )}
            </div>
          </Section>

          {/* Section 4 */}
          <Section icon={FileCheck2} title="Documents Verified" subtitle="Select all types of proof received">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {proofOptions.map((p) => {
                const checked = values.proofsReceived.includes(p);
                return (
                  <label
                    key={p}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                      checked
                        ? "border-primary/60 bg-primary/5"
                        : "border-border hover:bg-muted/60",
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleProof(p)} />
                    <span className="text-sm">{p}</span>
                  </label>
                );
              })}
            </div>
          </Section>

          {/* Section 5 */}
          <Section icon={Briefcase} title="Employment / Business Information">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Designation" required error={errors.designation}>
                <Input
                  className={cn("h-11", errors.designation && "border-destructive")}
                  value={values.designation}
                  onChange={(e) => set("designation", e.target.value)}
                />
              </Field>
              {showYearOfEstablishment && (
                <Field label="Year of Establishment">
                  <Input
                    className="h-11"
                    inputMode="numeric"
                    placeholder="e.g. 2017"
                    value={values.yearOfEstablishment}
                    onChange={(e) =>
                      set("yearOfEstablishment", e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                  />
                </Field>
              )}
              <Field label="Type of Business Firm">
                <SelectField
                  value={values.typeOfFirm}
                  onValueChange={(v) => set("typeOfFirm", v)}
                  options={firmTypeOptions}
                  placeholder="Select firm type"
                />
              </Field>
              <Field label="Nature of Business / Employer" required error={errors.natureOfBusiness}>
                <SelectField
                  value={values.natureOfBusiness}
                  onValueChange={(v) => set("natureOfBusiness", v)}
                  options={natureOptions}
                  placeholder="Select nature"
                  error={!!errors.natureOfBusiness}
                />
              </Field>
              <Field label="Website / Email of Employer" className="sm:col-span-2">
                <Input
                  className="h-11"
                  placeholder="company.com or hr@company.com"
                  value={values.websiteEmail}
                  onChange={(e) => set("websiteEmail", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {/* Section 6 */}
          <Section icon={CalendarClock} title="Experience Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={
                  isBusinessOwner || isSelfEmployed
                    ? "Business Conducted Since When?"
                    : "Employed Since When?"
                }
                required
                error={errors.sinceWhen}
              >
                <Input
                  className={cn("h-11", errors.sinceWhen && "border-destructive")}
                  placeholder="e.g. Mar 2019"
                  value={values.sinceWhen}
                  onChange={(e) => set("sinceWhen", e.target.value)}
                />
              </Field>
              <Field label="Likelihood of Change in Employment Status">
                <SelectField
                  value={values.changeLikelihood}
                  onValueChange={(v) => set("changeLikelihood", v)}
                  options={changeOptions}
                  placeholder="Select"
                />
              </Field>
              {showLineOfBusiness && (
                <Field label="Line of Business" className="sm:col-span-2">
                  <Input
                    className="h-11"
                    value={values.lineOfBusiness}
                    onChange={(e) => set("lineOfBusiness", e.target.value)}
                  />
                </Field>
              )}
            </div>
          </Section>

          {/* Section 7 */}
          <Section icon={PhoneCall} title="Contact Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Telephone Number" required error={errors.telephoneNumber}>
                <Input
                  className={cn(
                    "h-11 font-mono",
                    errors.telephoneNumber && "border-destructive",
                  )}
                  inputMode="tel"
                  value={values.telephoneNumber}
                  onChange={(e) => set("telephoneNumber", e.target.value)}
                />
              </Field>
              {showTerms && (
                <Field label="Terms of Employment">
                  <Input
                    className="h-11"
                    placeholder="e.g. Permanent, Full Time"
                    value={values.termsOfEmployment}
                    onChange={(e) => set("termsOfEmployment", e.target.value)}
                  />
                </Field>
              )}
              {showSupervisor && (
                <Field
                  label="Supervisor — Name / Designation / Mobile"
                  className="sm:col-span-2"
                >
                  <Input
                    className="h-11"
                    placeholder="e.g. Anil Mehta / Manager / 9820012345"
                    value={values.supervisorDetails}
                    onChange={(e) => set("supervisorDetails", e.target.value)}
                  />
                </Field>
              )}
              <Field label="Visiting Card of Authorized Executive Obtained?">
                <YesNo
                  value={values.visitingCardObtained}
                  onChange={(v) => set("visitingCardObtained", v)}
                  name="visitingCardObtained"
                />
              </Field>
            </div>
          </Section>

          {/* Section 8 */}
          <Section icon={ClipboardCheck} title="Verification Outcome">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Verifier Name & Remarks" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={values.verifierRemarks}
                  onChange={(e) => set("verifierRemarks", e.target.value)}
                />
              </Field>
              <Field label="Supervisor Name & Remarks" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  value={values.supervisorRemarks}
                  onChange={(e) => set("supervisorRemarks", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {/* Employment / Business Verification Notes */}
          <Section
            icon={FileText}
            title="Employment / Business Verification Notes"
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
          </>}

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
  children,
}: {
  icon: typeof Briefcase;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-background p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="grid h-9 w-9 place-items-center rounded-lg shrink-0 bg-primary/10 text-primary">
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
