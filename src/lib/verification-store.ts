import { create } from "zustand";

export type ModuleStatus = "not_started" | "in_progress" | "completed";

export const MODULE_KEYS = [
  "general",
  "residence",
  "employment",
  "pan",
  "salary",
  "documents",
  "business",
  "property",
  "evidence",
  "feedback",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type CaseStatus =
  | "draft"
  | "in_progress"
  | "submitted"
  | "approved"
  | "rejected";

export type Applicant = { id: string; isPrimary: boolean };

export type GeneralDetails = {
  borrowerName: string;
  fatherHusbandName: string;
  gender: "male" | "female" | "other" | "";
  residentStatus: "resident" | "non_resident" | "";
  panNumber: string;
  aadhaarNumber: string;
  dateOfBirth: string;
  qualification: string;
  maritalStatus: "single" | "married" | "";
  employmentType: string;
  // Report Information
  udinNumber: string;
  dateOfVerification: string;
  dateOfReportSubmission: string;
  caName: string;
  caSignatureDataUrl: string;
  caSignaturePath: string;
};

export const REPORT_DEFAULTS = {
  udinNumber: "26222863",
  caName: "PARVEZ MOHAMMED",
} as const;

export type ResidenceDetails = {
  addressTallied: "yes" | "no" | "";
  residenceLandmark: string;
  stayConfirmed: "yes" | "no" | "";
  stayingSinceYears: string;
  namePlateSeen: "yes" | "no" | "";
  namePlateMatch: "yes" | "no" | "";
  natureOfResidence: string;
  typeOfResidence: string;
  contactPersonName: string;
  contactPersonAddress: string;
  contactPersonRelation: string;
  city: string;
  pincode: string;
  residencePhone: string;
  mobileNumber: string;
  typeOfLocality: string;
  localityLandmark: string;
  livingStandard: string;
  numberOfDependents: string;
  accessibility: string;
  givenAddress: string;
  presentAddress: string;
  houseLocked: "yes" | "no" | "";
  nbApplicantStays: "yes" | "no" | "";
  nbApproxAge: string;
  nbFamilyMembers: string;
  nbOccupation: string;
  nbStayingSince: string;
  reasonNotConfirmed: string;
  untraceableReason: string;
  actualOccupantDetails: string;
  visitDateTime: string;
  verifierRemarks: string;
  supervisorRemarks: string;
  negativeRemarks: string;
  notes: string;
};

export type EmploymentCategory =
  | "salaried"
  | "government"
  | "self_employed"
  | "business_owner"
  | "housewife"
  | "retired"
  | "unemployed"
  | "student"
  | "";

/** Employment categories for which the applicant has no employment to verify. */
export const NON_EMPLOYED_CATEGORIES: EmploymentCategory[] = [
  "housewife",
  "retired",
  "unemployed",
  "student",
];

/** Employment categories for which Business Activity Verification is applicable. */
export const BUSINESS_CATEGORIES: EmploymentCategory[] = [
  "business_owner",
  "self_employed",
];

/** Loan types for which the Property Details (collateral) module is shown. */
export const PROPERTY_LOAN_TYPES = ["Home Loan", "Mortgage Loan"] as const;

/** True when the case's loan type requires collateral property verification. */
export function isPropertyLoanType(loanType: string | undefined): boolean {
  return !!loanType && (PROPERTY_LOAN_TYPES as readonly string[]).includes(loanType);
}

export type EmploymentDetails = {
  employmentCategory: EmploymentCategory;
  businessName: string;
  businessAddress: string;
  addressConfirmedBy: string;
  landmark: string;
  officeOwnership: string;
  nameBoardSighted: "yes" | "no" | "";
  nameBoardComments: string;
  proofsReceived: string[];
  designation: string;
  yearOfEstablishment: string;
  typeOfFirm: string;
  natureOfBusiness: string;
  websiteEmail: string;
  sinceWhen: string;
  changeLikelihood: string;
  lineOfBusiness: string;
  telephoneNumber: string;
  termsOfEmployment: string;
  supervisorDetails: string;
  visitingCardObtained: "yes" | "no" | "";
  verifierRemarks: string;
  supervisorRemarks: string;
  notes: string;
};

export type PanDetails = {
  panNumber: string;
  nameMatching: "yes" | "no" | "";
  genderMatching: "yes" | "no" | "";
  panVerifiedOfficial: "yes" | "no" | "";
  finalStatus: "confirmed" | "not_confirmed" | "";
  verifierRemarks: string;
  supervisorRemarks: string;
  negativeRemarks: string;
};

export type SalaryDetails = {
  companyName: string;
  designation: string;
  yearsOfService: string;
  serviceConfirmed: "yes" | "no" | "";
  grossMonthlyIncome: string;
  totalIncome: string;
  incomeUnderSalaryHeadVerified: "yes" | "no" | "na" | "";
  taxCalculationVerified: "yes" | "no" | "na" | "";
  form16TaxPayableCorrect: "yes" | "no" | "na" | "";
  remarks: string;
};

export type DocumentsDetails = {
  sealOfOrganization: "tallied" | "not_tallied" | "not_applicable" | "";
  signatureOfAuthority: "tallied" | "not_tallied" | "not_applicable" | "";
  salarySlipDateAmount: "tallied" | "not_tallied" | "not_applicable" | "";
  officeAddressCorrect: "tallied" | "not_tallied" | "not_applicable" | "";
};

export type BusinessDetails = {
  businessActivitySeen: "yes" | "no" | "";
  numberOfEmployees: string;
  equipmentStockSeen: string;
  businessPremisesCondition: "poor" | "average" | "good" | "excellent" | "";
  levelOfBusinessActivity: "low" | "moderate" | "good" | "excellent" | "";
  verifierRemarks: string;
  supervisorRemarks: string;
  negativeRemarks: string;
};

export type EvidenceCategory =
  | "applicantPhotos"
  | "coApplicantPhotos"
  | "residencePhotos"
  | "employmentPhotos"
  | "identityDocs"
  | "incomeDocs"
  | "additionalDocs";

export type EvidenceFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  dataUrl: string;
  storagePath?: string;
};

export type EvidenceDetails = Record<EvidenceCategory, EvidenceFile[]>;

export type FinalFeedbackStatus = "positive" | "negative" | "na" | "";

export const FINAL_FEEDBACK_ITEMS = [
  { key: "personalDetails", label: "Personal Details" },
  { key: "residenceVerification", label: "Residence Verification" },
  { key: "telephoneVerification", label: "Telephone Verification" },
  { key: "incomeProof", label: "Income Proof" },
  { key: "itReturn", label: "IT Return" },
  { key: "employerOffice", label: "Employer Office" },
  { key: "placeOfBusiness", label: "Place of Business" },
  { key: "bankDetails", label: "Bank Details" },
  { key: "otherDetails", label: "Other Details" },
] as const;

export type FinalFeedbackItemKey = (typeof FINAL_FEEDBACK_ITEMS)[number]["key"];

export type FinalFeedbackDetails = {
  items: Partial<Record<FinalFeedbackItemKey, FinalFeedbackStatus>>;
  guarantorPresent: "yes" | "no" | "";
  guarantorName: string;
  /** Single overall opinion for guarantor. Replaces former per-item guarantorItems. */
  guarantorOpinion?: "positive" | "negative" | "";
  /** @deprecated kept for backward read of older drafts; no longer written. */
  guarantorItems?: Partial<Record<FinalFeedbackItemKey, FinalFeedbackStatus>>;
};

export type PropertyDetails = {
  addressOfProperty: string;
  addressMatchesApplication: "yes" | "no" | "";
  ownerName: string;
  typeOfProperty: string;
  locality: string;
  ownership: string;
  typeOfConstruction: string;
  stageOfConstruction: string;
  independentAccess: "yes" | "no" | "";
  accessType: string;
  buildingUsageType: string;
  builderName: string;
  builderReputation: string;
  builderSource: string;
  builderStage: string;
  workInProgress: string;
  likelyCompletionDate: string;
  dateOfSiteVisit: string;
  verifierRemarks: string;
};

export type ModuleData = {
  status: ModuleStatus;
  general?: Partial<GeneralDetails>;
  residence?: Partial<ResidenceDetails>;
  employment?: Partial<EmploymentDetails>;
  pan?: Partial<PanDetails>;
  salary?: Partial<SalaryDetails>;
  documents?: Partial<DocumentsDetails>;
  business?: Partial<BusinessDetails>;
  property?: Partial<PropertyDetails>;
  evidence?: Partial<EvidenceDetails>;
  feedback?: Partial<FinalFeedbackDetails>;
};

export type VerificationCase = {
  id: string;
  loanType: string;
  bankName: string;
  branchName: string;
  loanAmount: string;
  createdAt: string;
  status: CaseStatus;
  applicants: Applicant[];
  activeApplicantId: string;
  modules: Record<string, Record<ModuleKey, ModuleData>>;
  /** Database UUID (review/manager flows). Undefined for purely-local cases. */
  dbId?: string;
  /** Display name of the field executive the case is assigned to (manager views). */
  assignedToName?: string;
  /** Display name of the manager who last reviewed the case. */
  reviewedByName?: string;
  /** ISO timestamp of the last manager review (approve/reject). */
  reviewedAt?: string | null;
  /** Manager's review notes (typically a rejection reason). */
  reviewNotes?: string | null;
};

/**
 * A case is locked from further executive editing once it has been submitted
 * for approval or approved. Rejected cases stay editable so the executive can
 * fix and resubmit.
 */
export function isCaseLocked(status: CaseStatus): boolean {
  return status === "submitted" || status === "approved";
}

export const DEFAULT_BANK_NAME = "Bank of India";

type State = {
  cases: Record<string, VerificationCase>;
  caseOrder: string[];
  activeCaseId: string | null;
  isHydrated: boolean;
  // Mirrors of the active case for backwards-compatible selectors
  applicants: Applicant[];
  activeApplicantId: string;
  modules: Record<string, Record<ModuleKey, ModuleData>>;
};

type Actions = {
  createCase: (input: { loanType: string; branchName: string; loanAmount: string; bankName?: string }) => string;
  loadCase: (id: string) => void;
  deleteCase: (id: string) => void;
  setCaseStatus: (id: string, status: CaseStatus) => void;
  setActive: (id: string) => void;
  addCoApplicant: () => void;
  removeApplicant: (id: string) => void;
  setModuleStatus: (applicantId: string, key: ModuleKey, status: ModuleStatus) => void;
  saveGeneral: (a: string, d: Partial<GeneralDetails>, s: ModuleStatus) => void;
  saveResidence: (a: string, d: Partial<ResidenceDetails>, s: ModuleStatus) => void;
  saveEmployment: (a: string, d: Partial<EmploymentDetails>, s: ModuleStatus) => void;
  savePan: (a: string, d: Partial<PanDetails>, s: ModuleStatus) => void;
  saveSalary: (a: string, d: Partial<SalaryDetails>, s: ModuleStatus) => void;
  saveDocuments: (a: string, d: Partial<DocumentsDetails>, s: ModuleStatus) => void;
  saveBusiness: (a: string, d: Partial<BusinessDetails>, s: ModuleStatus) => void;
  saveProperty: (a: string, d: Partial<PropertyDetails>, s: ModuleStatus) => void;
  saveEvidence: (a: string, d: Partial<EvidenceDetails>, s: ModuleStatus) => void;
  saveFeedback: (a: string, d: Partial<FinalFeedbackDetails>, s: ModuleStatus) => void;
  saveDraftActiveCase: () => void;
  /** Move the active case to "submitted" locally (cloud persistence handled separately). */
  submitActiveCase: () => void;
  /** Update a case's status WITHOUT triggering a cloud sync (used after a server write confirms). */
  setCaseStatusLocal: (id: string, status: CaseStatus, patch?: Partial<VerificationCase>) => void;
  /** Inject a case fetched from the server (e.g. a manager review) and make it active, without marking it dirty. */
  loadExternalCase: (caseObj: VerificationCase) => void;
};

const emptyModules = (): Record<ModuleKey, ModuleData> =>
  MODULE_KEYS.reduce(
    (acc, k) => {
      acc[k] = { status: "not_started" };
      return acc;
    },
    {} as Record<ModuleKey, ModuleData>,
  );

function generateCaseId(existing: Record<string, VerificationCase>): string {
  const year = new Date().getFullYear();
  const prefix = `VER-${year}-`;
  const nums = Object.keys(existing)
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

function deriveStatus(c: VerificationCase): CaseStatus {
  if (c.status === "submitted" || c.status === "approved" || c.status === "rejected") {
    return c.status;
  }
  // Auto-progress draft → in_progress when any module has activity
  const anyActive = c.applicants.some((a) =>
    MODULE_KEYS.some((k) => {
      const st = c.modules[a.id]?.[k]?.status;
      return st === "in_progress" || st === "completed";
    }),
  );
  return anyActive ? "in_progress" : "draft";
}

function syncMirror(c: VerificationCase | undefined) {
  if (!c) {
    return { applicants: [], activeApplicantId: "", modules: {} };
  }
  return {
    applicants: c.applicants,
    activeApplicantId: c.activeApplicantId,
    modules: c.modules,
  };
}

function updateActiveCase(
  s: State,
  mutator: (c: VerificationCase) => VerificationCase,
): Partial<State> {
  if (!s.activeCaseId) return {};
  const current = s.cases[s.activeCaseId];
  if (!current) return {};
  const updated = mutator(current);
  const withStatus: VerificationCase = { ...updated, status: deriveStatus(updated) };
  return {
    cases: { ...s.cases, [s.activeCaseId]: withStatus },
    ...syncMirror(withStatus),
  };
}

// -------- activeCaseId persistence (localStorage) --------
const ACTIVE_CASE_STORAGE_KEY = "verifypro:activeCaseId";
function readPersistedActiveCaseId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ACTIVE_CASE_STORAGE_KEY);
  } catch {
    return null;
  }
}
function writePersistedActiveCaseId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(ACTIVE_CASE_STORAGE_KEY, id);
    else window.localStorage.removeItem(ACTIVE_CASE_STORAGE_KEY);
  } catch {
    /* ignore quota / privacy mode errors */
  }
}
function logActive(label: string, id: string | null | undefined) {
  // eslint-disable-next-line no-console
  console.log(`[activeCaseId] ${label}`, id ?? null);
}

const initialActiveCaseId = readPersistedActiveCaseId();
if (initialActiveCaseId) logActive("boot:read-from-storage", initialActiveCaseId);

export const useVerificationStore = create<State & Actions & { hydrateAll: (cases: Record<string, VerificationCase>, caseOrder: string[]) => void; resetStore: () => void }>()((set, get) => ({
  cases: {},
  caseOrder: [],
  activeCaseId: initialActiveCaseId,
  isHydrated: false,
  applicants: [],
  activeApplicantId: "",
  modules: {},

  hydrateAll: (cases, caseOrder) =>
    set((s) => {
      // Keep the persisted activeCaseId if the case still exists; otherwise clear.
      let nextActive = s.activeCaseId;
      if (nextActive && !cases[nextActive]) {
        logActive("hydrateAll:cleared (case missing)", nextActive);
        nextActive = null;
        writePersistedActiveCaseId(null);
      } else {
        logActive("hydrateAll:preserved", nextActive);
      }
      const active = nextActive ? cases[nextActive] : undefined;
      return {
        cases,
        caseOrder,
        isHydrated: true,
        activeCaseId: nextActive,
        ...(active ? syncMirror(active) : {}),
      };
    }),

  resetStore: () => {
    writePersistedActiveCaseId(null);
    logActive("resetStore", null);
    set(() => ({
      cases: {},
      caseOrder: [],
      activeCaseId: null,
      isHydrated: false,
      applicants: [],
      activeApplicantId: "",
      modules: {},
    }));
  },


  createCase: ({ loanType, branchName, loanAmount, bankName }) => {
    const id = generateCaseId(get().cases);
    const primaryId = "primary";
    const newCase: VerificationCase = {
      id,
      loanType,
      bankName: bankName?.trim() || "Bank of India",
      branchName,
      loanAmount,
      createdAt: new Date().toISOString(),
      status: "draft",
      applicants: [{ id: primaryId, isPrimary: true }],
      activeApplicantId: primaryId,
      modules: { [primaryId]: emptyModules() },
    };
    set((s) => ({
      cases: { ...s.cases, [id]: newCase },
      caseOrder: [id, ...s.caseOrder.filter((x) => x !== id)],
      activeCaseId: id,
      ...syncMirror(newCase),
    }));
    writePersistedActiveCaseId(id);
    logActive("createCase", id);
    markDirty(id);
    return id;
  },

  loadCase: (id) => {
    set((s) => {
      const c = s.cases[id];
      if (!c) return {};
      return { activeCaseId: id, ...syncMirror(c) };
    });
    if (get().cases[id]) {
      writePersistedActiveCaseId(id);
      logActive("loadCase", id);
    }
  },

  deleteCase: (id) => {
    const exists = get().cases[id];
    set((s) => {
      if (!s.cases[id]) return {};
      const nextCases = { ...s.cases };
      delete nextCases[id];
      const nextOrder = s.caseOrder.filter((x) => x !== id);
      const nextActive = s.activeCaseId === id ? null : s.activeCaseId;
      if (s.activeCaseId === id) {
        writePersistedActiveCaseId(null);
        logActive("deleteCase:cleared-active", id);
      }
      return {
        cases: nextCases,
        caseOrder: nextOrder,
        activeCaseId: nextActive,
        ...(s.activeCaseId === id ? syncMirror(undefined) : {}),
      };
    });
    if (exists) notifyDelete(id);
  },

  setCaseStatus: (id, status) => {
    set((s) => {
      const c = s.cases[id];
      if (!c) return {};
      const updated = { ...c, status };
      return {
        cases: { ...s.cases, [id]: updated },
        ...(s.activeCaseId === id ? syncMirror(updated) : {}),
      };
    });
    markDirty(id);
  },

  saveDraftActiveCase: () => {
    set((s) => updateActiveCase(s, (c) => ({ ...c, status: "draft" })));
    const id = get().activeCaseId;
    if (id) markDirty(id);
  },

  setActive: (id) => {
    set((s) => updateActiveCase(s, (c) => ({ ...c, activeApplicantId: id })));
    const cid = get().activeCaseId;
    if (cid) markDirty(cid);
  },

  addCoApplicant: () => {
    if (isActiveLocked()) return;
    set((s) =>
      updateActiveCase(s, (c) => {
        const newId = `co-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        return {
          ...c,
          applicants: [...c.applicants, { id: newId, isPrimary: false }],
          modules: { ...c.modules, [newId]: emptyModules() },
        };
      }),
    );
    const cid = get().activeCaseId;
    if (cid) markDirty(cid);
  },

  removeApplicant: (id) => {
    if (isActiveLocked()) return;
    set((s) =>
      updateActiveCase(s, (c) => {
        if (id === "primary") return c;
        const applicants = c.applicants.filter((a) => a.id !== id);
        const modules = { ...c.modules };
        delete modules[id];
        const activeApplicantId =
          c.activeApplicantId === id ? applicants[0]?.id ?? "" : c.activeApplicantId;
        return { ...c, applicants, modules, activeApplicantId };
      }),
    );
    const cid = get().activeCaseId;
    if (cid) markDirty(cid);
  },

  setModuleStatus: (applicantId, key, status) => {
    if (isActiveLocked()) return;
    set((s) =>
      updateActiveCase(s, (c) => ({
        ...c,
        modules: {
          ...c.modules,
          [applicantId]: {
            ...c.modules[applicantId],
            [key]: { ...c.modules[applicantId]?.[key], status },
          },
        },
      })),
    );
    const cid = get().activeCaseId;
    if (cid) markDirty(cid);
  },

  saveGeneral: (a, d, st) => { if (isActiveLocked()) return; set((s) => updateActiveCase(s, (c) => mergeModule(c, a, "general", "general", d, st))); const cid = get().activeCaseId; if (cid) markDirty(cid); },
  saveResidence: (a, d, st) => { if (isActiveLocked()) return; set((s) => updateActiveCase(s, (c) => mergeModule(c, a, "residence", "residence", d, st))); const cid = get().activeCaseId; if (cid) markDirty(cid); },
  saveEmployment: (a, d, st) => { if (isActiveLocked()) return; set((s) => updateActiveCase(s, (c) => mergeModule(c, a, "employment", "employment", d, st))); const cid = get().activeCaseId; if (cid) markDirty(cid); },
  savePan: (a, d, st) => { if (isActiveLocked()) return; set((s) => updateActiveCase(s, (c) => mergeModule(c, a, "pan", "pan", d, st))); const cid = get().activeCaseId; if (cid) markDirty(cid); },
  saveSalary: (a, d, st) => { if (isActiveLocked()) return; set((s) => updateActiveCase(s, (c) => mergeModule(c, a, "salary", "salary", d, st))); const cid = get().activeCaseId; if (cid) markDirty(cid); },
  saveDocuments: (a, d, st) => { if (isActiveLocked()) return; set((s) => updateActiveCase(s, (c) => mergeModule(c, a, "documents", "documents", d, st))); const cid = get().activeCaseId; if (cid) markDirty(cid); },
  saveBusiness: (a, d, st) => { if (isActiveLocked()) return; set((s) => updateActiveCase(s, (c) => mergeModule(c, a, "business", "business", d, st))); const cid = get().activeCaseId; if (cid) markDirty(cid); },
  saveProperty: (a, d, st) => { if (isActiveLocked()) return; set((s) => updateActiveCase(s, (c) => mergeModule(c, a, "property", "property", d, st))); const cid = get().activeCaseId; if (cid) markDirty(cid); },
  saveEvidence: (a, d, st) => { if (isActiveLocked()) return; set((s) => updateActiveCase(s, (c) => mergeModule(c, a, "evidence", "evidence", d, st))); const cid = get().activeCaseId; if (cid) markDirty(cid); },
  saveFeedback: (a, d, st) => { if (isActiveLocked()) return; set((s) => updateActiveCase(s, (c) => mergeModule(c, a, "feedback", "feedback", d, st))); const cid = get().activeCaseId; if (cid) markDirty(cid); },

  submitActiveCase: () => {
    set((s) => {
      const id = s.activeCaseId;
      if (!id) return {};
      const c = s.cases[id];
      if (!c) return {};
      const updated: VerificationCase = { ...c, status: "submitted" };
      return { cases: { ...s.cases, [id]: updated }, ...syncMirror(updated) };
    });
    const id = get().activeCaseId;
    if (id) markDirty(id);
  },

  setCaseStatusLocal: (id, status, patch) => {
    set((s) => {
      const c = s.cases[id];
      if (!c) return {};
      const updated: VerificationCase = { ...c, ...patch, status };
      return {
        cases: { ...s.cases, [id]: updated },
        ...(s.activeCaseId === id ? syncMirror(updated) : {}),
      };
    });
  },

  loadExternalCase: (caseObj) => {
    const key = caseObj.dbId ?? caseObj.id;
    set((s) => ({
      cases: { ...s.cases, [key]: caseObj },
      caseOrder: s.caseOrder.includes(key) ? s.caseOrder : [...s.caseOrder, key],
      activeCaseId: key,
      ...syncMirror(caseObj),
    }));
    writePersistedActiveCaseId(key);
    logActive("loadExternalCase", key);
  },
}));

/** True when the active case has been submitted/approved and must not be edited. */
function isActiveLocked(): boolean {
  const s = useVerificationStore.getState();
  const c = s.activeCaseId ? s.cases[s.activeCaseId] : null;
  return !!c && isCaseLocked(c.status);
}

// ---------------- Cloud sync hooks (driven by CaseSyncProvider) ----------------
type SyncListeners = {
  onDirty?: (caseId: string) => void;
  onDelete?: (caseId: string) => void;
};
const syncListeners: SyncListeners = {};
function markDirty(caseId: string) {
  syncListeners.onDirty?.(caseId);
}
function notifyDelete(caseId: string) {
  syncListeners.onDelete?.(caseId);
}
export function setStoreSyncListeners(l: SyncListeners) {
  syncListeners.onDirty = l.onDirty;
  syncListeners.onDelete = l.onDelete;
}

/**
 * Strip heavy base64 dataUrl payloads (evidence files, CA signature image)
 * before writing to localStorage. localStorage is ~5 MB per origin; even a
 * handful of mobile photos serialized as data URLs blow past that quota and
 * cause every subsequent zustand `set()` to THROW synchronously, which silently
 * breaks Save & Continue across the app. We keep the metadata so drafts still
 * show counts; users re-upload files if they reload mid-draft.
 */
function stripHeavyFields(cases: Record<string, VerificationCase>): Record<string, VerificationCase> {
  const out: Record<string, VerificationCase> = {};
  for (const [caseId, c] of Object.entries(cases)) {
    const modules: typeof c.modules = {};
    for (const [appId, mods] of Object.entries(c.modules)) {
      const cleanedMods = { ...mods } as Record<ModuleKey, ModuleData>;
      // Strip evidence dataUrl payloads
      const ev = cleanedMods.evidence;
      if (ev?.evidence) {
        const evData = ev.evidence as Partial<EvidenceDetails>;
        const stripped: Partial<EvidenceDetails> = {};
        for (const [k, list] of Object.entries(evData)) {
          if (Array.isArray(list)) {
            stripped[k as EvidenceCategory] = list.map((f) => ({ ...f, dataUrl: "" }));
          }
        }
        cleanedMods.evidence = { ...ev, evidence: stripped };
      }
      // Strip CA signature image (often a base64 PNG)
      const gen = cleanedMods.general;
      if (gen?.general) {
        const g = gen.general as Partial<GeneralDetails>;
        if (g.caSignatureDataUrl && g.caSignatureDataUrl.length > 2000) {
          cleanedMods.general = {
            ...gen,
            general: { ...g, caSignatureDataUrl: "" },
          };
        }
      }
      modules[appId] = cleanedMods;
    }
    out[caseId] = { ...c, modules };
  }
  return out;
}

function mergeModule(
  c: VerificationCase,
  applicantId: string,
  modKey: ModuleKey,
  payloadKey: string,
  data: Record<string, unknown> | unknown,
  status: ModuleStatus,
): VerificationCase {

  const appMods = c.modules[applicantId] ?? emptyModules();
  const current = appMods[modKey] ?? { status: "not_started" };
  const existingPayload = (current as Record<string, unknown>)[payloadKey];
  const merged = {
    ...current,
    status,
    [payloadKey]: { ...((existingPayload as Record<string, unknown>) ?? {}), ...((data as Record<string, unknown>) ?? {}) },
  } as ModuleData;

  return {
    ...c,
    modules: {
      ...c.modules,
      [applicantId]: { ...appMods, [modKey]: merged },
    },
  };
}

export function labelApplicants(applicants: Applicant[]) {
  let co = 0;
  return applicants.map((a) => {
    if (!a.isPrimary) co += 1;
    return { ...a, label: a.isPrimary ? "Applicant" : `Co-Applicant ${co}` };
  });
}

export const MODULE_META: Record<ModuleKey, { label: string }> = {
  general: { label: "General Details" },
  residence: { label: "Residence Verification" },
  employment: { label: "Employment Verification" },
  pan: { label: "PAN Verification" },
  salary: { label: "Salary / Form-16 Verification" },
  documents: { label: "Documents Verification" },
  business: { label: "Business Activity Verification" },
  property: { label: "Property Details Verification" },
  evidence: { label: "Evidence Upload" },
  feedback: { label: "Final Feedback" },
};

export const CASE_STATUS_META: Record<CaseStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-amber-100 text-amber-700" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-700" },
  submitted: { label: "Submitted For Approval", className: "bg-indigo-100 text-indigo-700" },
  approved: { label: "Approved", className: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Rejected", className: "bg-rose-100 text-rose-700" },
};

export function selectCaseList(state: State): VerificationCase[] {
  return state.caseOrder.map((id) => state.cases[id]).filter(Boolean) as VerificationCase[];
}

/**
 * Returns false when a module should be skipped (Not Applicable) for the
 * given applicant — e.g. Salary Verification for Business Owner / Self Employed,
 * or Business Activity Verification for salaried/government employees.
 */
export function isModuleApplicable(
  modules: Record<ModuleKey, ModuleData> | undefined,
  key: ModuleKey,
  loanType?: string,
): boolean {
  if (key === "property") {
    return isPropertyLoanType(loanType);
  }
  if (!modules) return true;
  const cat = (modules.employment?.employment as Partial<EmploymentDetails> | undefined)
    ?.employmentCategory ?? "";
  const employmentNA = NON_EMPLOYED_CATEGORIES.includes(cat as EmploymentCategory);

  if (key === "employment") {
    return !employmentNA;
  }
  if (key === "salary") {
    if (employmentNA) return false;
    if (cat === "business_owner" || cat === "self_employed") return false;
    return true;
  }
  if (key === "business") {
    return BUSINESS_CATEGORIES.includes(cat as EmploymentCategory);
  }
  if (key === "documents") {
    // Cascade: when there's no employment to verify, document tally is N/A
    if (employmentNA) return false;
    return true;
  }
  return true;
}

/**
 * Returns false when a module should be hidden completely from the workflow.
 * All modules now remain visible — they display a Not Applicable badge when
 * they don't apply rather than disappearing.
 */
export function isModuleVisible(
  _modules: Record<ModuleKey, ModuleData> | undefined,
  _key: ModuleKey,
): boolean {
  return true;
}

export function applicableModuleKeys(
  modules: Record<ModuleKey, ModuleData> | undefined,
  loanType?: string,
): ModuleKey[] {
  return MODULE_KEYS.filter((k) => isModuleApplicable(modules, k, loanType));
}

/**
 * Returns the modules that participate in the linear Save & Continue
 * workflow. Differs from applicableModuleKeys: employment is always part
 * of the workflow (the page shows a Not Applicable panel with a Continue
 * button for housewife / retired / student / unemployed) so the user is
 * never jumped straight from Residence to PAN without seeing it. Evidence
 * Upload is always part of the workflow regardless of category.
 */
export function workflowModuleKeys(
  modules: Record<ModuleKey, ModuleData> | undefined,
  loanType?: string,
): ModuleKey[] {
  const cat = (modules?.employment?.employment as Partial<EmploymentDetails> | undefined)
    ?.employmentCategory ?? "";
  const employmentNA = NON_EMPLOYED_CATEGORIES.includes(cat as EmploymentCategory);
  return MODULE_KEYS.filter((k) => {
    if (
      k === "general" ||
      k === "residence" ||
      k === "employment" ||
      k === "pan" ||
      k === "evidence" ||
      k === "feedback"
    ) {
      return true;
    }
    if (k === "salary") {
      return !employmentNA && cat !== "business_owner" && cat !== "self_employed";
    }
    if (k === "documents") {
      return !employmentNA;
    }
    if (k === "business") {
      return BUSINESS_CATEGORIES.includes(cat as EmploymentCategory);
    }
    if (k === "property") {
      return isPropertyLoanType(loanType);
    }
    return true;
  });
}

export const MODULE_ROUTE: Record<ModuleKey, string> = {
  general: "/verifications/general",
  residence: "/verifications/residence",
  employment: "/verifications/employment",
  pan: "/verifications/pan",
  salary: "/verifications/salary",
  documents: "/verifications/documents",
  business: "/verifications/business",
  property: "/verifications/property",
  evidence: "/verifications/evidence",
  feedback: "/verifications/feedback",
};

/**
 * Returns the next route in the linear verification workflow.
 * After the last workflow module, returns the workspace (NOT the report
 * preview) — the user must explicitly choose to preview the report from
 * the workspace completion screen.
 */
export function nextModuleRoute(
  modules: Record<ModuleKey, ModuleData> | undefined,
  current: ModuleKey,
  loanType?: string,
): string {
  const seq = workflowModuleKeys(modules, loanType);
  const i = seq.indexOf(current);
  if (i >= 0 && i < seq.length - 1) return MODULE_ROUTE[seq[i + 1]];
  return "/verifications/workspace";
}
