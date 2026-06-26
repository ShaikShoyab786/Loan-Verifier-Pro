import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Save,
  ArrowRight,
  AlertCircle,
  Landmark,
  MapPin,
  UserSquare2,
  Building2,
  Construction,
  DoorOpen,
  HardHat,
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
  type PropertyDetails,
} from "@/lib/verification-store";
import { ModuleTopBar } from "@/components/module-top-bar";

export const Route = createFileRoute("/_app/verifications/property")({
  head: () => ({ meta: [{ title: "Property Details Verification — VerifyPro" }] }),
  component: PropertyVerificationPage,
});

const typeOfPropertyOptions = [
  "Residential",
  "Commercial",
  "Industrial",
  "Agriculture",
  "Others",
];
const localityOptions = [
  "Posh",
  "Upper Middle",
  "Middle",
  "Lower Middle",
  "Slum",
  "Other",
];
const ownershipOptions = [
  "Independently Owned",
  "Jointly Owned",
  "Free Hold",
  "Lease Hold",
];
const constructionTypeOptions = [
  "Ready Built House",
  "House Under Construction",
  "Ready Built Flat",
  "Flat Under Construction",
  "Group of Houses",
  "Vacant Land",
];
const constructionStageOptions = ["Ground Leveling", "Foundation", "Lintel", "Other"];
const accessTypeOptions = ["Pedestrian", "Two Wheeler", "Four Wheeler", "Other"];
const buildingUsageOptions = [
  "Shops",
  "Godown",
  "Temple",
  "Educational",
  "Wine Shop",
  "Residential",
  "Other",
];

const empty: PropertyDetails = {
  addressOfProperty: "",
  addressMatchesApplication: "",
  ownerName: "",
  typeOfProperty: "",
  locality: "",
  ownership: "",
  typeOfConstruction: "",
  stageOfConstruction: "",
  independentAccess: "",
  accessType: "",
  buildingUsageType: "",
  builderName: "",
  builderReputation: "",
  builderSource: "",
  builderStage: "",
  workInProgress: "",
  likelyCompletionDate: "",
  dateOfSiteVisit: "",
  verifierRemarks: "",
};

const testData: PropertyDetails = {
  addressOfProperty: "Plot 17, Green Valley Township, Sarjapur Road, Bengaluru - 560035",
  addressMatchesApplication: "yes",
  ownerName: "Rajesh Sharma",
  typeOfProperty: "Residential",
  locality: "Upper Middle",
  ownership: "Jointly Owned",
  typeOfConstruction: "Flat Under Construction",
  stageOfConstruction: "Lintel",
  independentAccess: "yes",
  accessType: "Four Wheeler",
  buildingUsageType: "Residential",
  builderName: "Prestige Constructions",
  builderReputation: "Good — established developer with multiple completed projects",
  builderSource: "RERA registration and on-site project office",
  builderStage: "5th floor slab in progress",
  workInProgress: "Yes — active construction observed at site",
  likelyCompletionDate: "2027-06-30",
  dateOfSiteVisit: new Date().toISOString().slice(0, 10),
  verifierRemarks: "Property located and identified. Construction in progress as reported.",
};

type Errors = Partial<Record<keyof PropertyDetails, string>>;

function PropertyVerificationPage() {
  const navigate = useNavigate();
  const applicants = useVerificationStore((s) => s.applicants);
  const activeId = useVerificationStore((s) => s.activeApplicantId);
  const saved = useVerificationStore(
    (s) =>
      (s.modules[activeId]?.property as unknown as { property?: Partial<PropertyDetails> })
        ?.property,
  );
  const saveProperty = useVerificationStore((s) => s.saveProperty);

  const labeled = useMemo(() => labelApplicants(applicants), [applicants]);
  const activeLabel = labeled.find((a) => a.id === activeId)?.label ?? "Applicant";

  const [values, setValues] = useState<PropertyDetails>({ ...empty, ...saved });
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    setValues({ ...empty, ...(saved ?? {}) });
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const set = <K extends keyof PropertyDetails>(key: K, val: PropertyDetails[K]) => {
    setValues((v) => ({ ...v, [key]: val }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!values.addressOfProperty.trim()) e.addressOfProperty = "Required";
    if (!values.addressMatchesApplication) e.addressMatchesApplication = "Required";
    if (!values.ownerName.trim()) e.ownerName = "Required";
    if (!values.typeOfProperty) e.typeOfProperty = "Required";
    if (!values.typeOfConstruction) e.typeOfConstruction = "Required";
    if (!values.dateOfSiteVisit) e.dateOfSiteVisit = "Required";
    return e;
  };

  const handleFillTestData = () => {
    setValues({ ...testData });
    setErrors({});
    toast.info("Test data filled", { description: "Property details populated." });
  };

  const handleSaveDraft = () => {
    saveProperty(activeId, values, "in_progress");
    toast.success("Draft saved", { description: `Property details saved for ${activeLabel}.` });
  };

  const handleSaveContinue = () => {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) {
      toast.error("Please fix the errors before continuing.");
      return;
    }
    saveProperty(activeId, values, "completed");
    toast.success("Property details completed", {
      description: `Collateral property has been verified.`,
    });
    const state = useVerificationStore.getState();
    const loanType = state.activeCaseId ? state.cases[state.activeCaseId]?.loanType : undefined;
    const __next = nextModuleRoute(state.modules[activeId], "property", loanType);
    navigate({ to: __next });
  };

  const isUnderConstruction = values.typeOfConstruction.includes("Under Construction");
  const isFlatUnderConstruction = values.typeOfConstruction === "Flat Under Construction";
  const showAccessType = values.independentAccess === "yes";

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <ModuleTopBar />

      <div className="rounded-2xl border border-border bg-card">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:p-6 border-b border-border">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary shrink-0">
            <Landmark className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
              Property Details Verification
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verify the collateral property — address, ownership, construction and site visit.
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
          <Section icon={MapPin} title="Property Address" subtitle="Confirm address and ownership of the collateral">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Address of Property" required error={errors.addressOfProperty} className="sm:col-span-2">
                <Textarea
                  rows={2}
                  className={cn(errors.addressOfProperty && "border-destructive")}
                  placeholder="Full address of the property offered as collateral"
                  value={values.addressOfProperty}
                  onChange={(e) => set("addressOfProperty", e.target.value)}
                />
              </Field>
              <Field
                label="Whether Address Matches Application"
                required
                error={errors.addressMatchesApplication}
              >
                <YesNo
                  value={values.addressMatchesApplication}
                  onChange={(v) => set("addressMatchesApplication", v)}
                  name="addressMatchesApplication"
                />
              </Field>
              <Field label="Name of Owner" required error={errors.ownerName}>
                <Input
                  className={cn("h-11", errors.ownerName && "border-destructive")}
                  placeholder="Registered owner of the property"
                  value={values.ownerName}
                  onChange={(e) => set("ownerName", e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {/* Section 2 */}
          <Section icon={UserSquare2} title="Property Classification">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Type of Property" required error={errors.typeOfProperty}>
                <SelectField
                  value={values.typeOfProperty}
                  onValueChange={(v) => set("typeOfProperty", v)}
                  options={typeOfPropertyOptions}
                  placeholder="Select type"
                  error={!!errors.typeOfProperty}
                />
              </Field>
              <Field label="Locality">
                <SelectField
                  value={values.locality}
                  onValueChange={(v) => set("locality", v)}
                  options={localityOptions}
                  placeholder="Select locality"
                />
              </Field>
              <Field label="Ownership">
                <SelectField
                  value={values.ownership}
                  onValueChange={(v) => set("ownership", v)}
                  options={ownershipOptions}
                  placeholder="Select ownership"
                />
              </Field>
              <Field label="Building Usage Type">
                <SelectField
                  value={values.buildingUsageType}
                  onValueChange={(v) => set("buildingUsageType", v)}
                  options={buildingUsageOptions}
                  placeholder="Select usage"
                />
              </Field>
            </div>
          </Section>

          {/* Section 3 */}
          <Section icon={Construction} title="Construction Details">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Type of Construction" required error={errors.typeOfConstruction}>
                <SelectField
                  value={values.typeOfConstruction}
                  onValueChange={(v) => set("typeOfConstruction", v)}
                  options={constructionTypeOptions}
                  placeholder="Select construction type"
                  error={!!errors.typeOfConstruction}
                />
              </Field>
              {isUnderConstruction && (
                <Field label="Stage of Construction">
                  <SelectField
                    value={values.stageOfConstruction}
                    onValueChange={(v) => set("stageOfConstruction", v)}
                    options={constructionStageOptions}
                    placeholder="Select stage"
                  />
                </Field>
              )}
            </div>
          </Section>

          {/* Section 4 */}
          <Section icon={DoorOpen} title="Access">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Independent Access Available">
                <YesNo
                  value={values.independentAccess}
                  onChange={(v) => set("independentAccess", v)}
                  name="independentAccess"
                />
              </Field>
              {showAccessType && (
                <Field label="Type of Access">
                  <SelectField
                    value={values.accessType}
                    onValueChange={(v) => set("accessType", v)}
                    options={accessTypeOptions}
                    placeholder="Select access type"
                  />
                </Field>
              )}
            </div>
          </Section>

          {/* Section 5 — only for Flat under construction */}
          {isFlatUnderConstruction && (
            <Section
              icon={HardHat}
              title="Builder Details"
              subtitle="Required for a flat under construction"
            >
              <div className="grid gap-5 sm:grid-cols-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Field label="Builder Name">
                  <Input
                    className="h-11"
                    value={values.builderName}
                    onChange={(e) => set("builderName", e.target.value)}
                  />
                </Field>
                <Field label="Builder Reputation">
                  <Input
                    className="h-11"
                    value={values.builderReputation}
                    onChange={(e) => set("builderReputation", e.target.value)}
                  />
                </Field>
                <Field label="Source of Information">
                  <Input
                    className="h-11"
                    value={values.builderSource}
                    onChange={(e) => set("builderSource", e.target.value)}
                  />
                </Field>
                <Field label="Construction Stage">
                  <Input
                    className="h-11"
                    value={values.builderStage}
                    onChange={(e) => set("builderStage", e.target.value)}
                  />
                </Field>
                <Field label="Work in Progress">
                  <Input
                    className="h-11"
                    value={values.workInProgress}
                    onChange={(e) => set("workInProgress", e.target.value)}
                  />
                </Field>
                <Field label="Likely Date of Completion">
                  <Input
                    type="date"
                    className="h-11"
                    value={values.likelyCompletionDate}
                    onChange={(e) => set("likelyCompletionDate", e.target.value)}
                  />
                </Field>
              </div>
            </Section>
          )}

          {/* Section 6 */}
          <Section icon={ClipboardCheck} title="Site Visit & Outcome">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Date of Site Visit" required error={errors.dateOfSiteVisit}>
                <Input
                  type="date"
                  className={cn("h-11", errors.dateOfSiteVisit && "border-destructive")}
                  value={values.dateOfSiteVisit}
                  onChange={(e) => set("dateOfSiteVisit", e.target.value)}
                />
              </Field>
              <Field label="Verifier Remarks" className="sm:col-span-2">
                <Textarea
                  rows={2}
                  placeholder="Observations from the property site visit"
                  value={values.verifierRemarks}
                  onChange={(e) => set("verifierRemarks", e.target.value)}
                />
              </Field>
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
  icon: typeof Landmark;
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
