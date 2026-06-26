---
name: loanType-gated verification modules
description: How to add a verification module that only applies for certain loan types without it being skipped in the workflow
---

# loanType-gated verification modules

When a verification module is conditionally applicable based on case `loanType`
(e.g. "Property Details" only for "Home Loan"/"Mortgage Loan"), the gating
predicate (`isModuleApplicable`) takes an optional `loanType` argument.

**Rule:** every `nextModuleRoute(...)` call site across ALL module form routes
must pass the active case's loanType. `nextModuleRoute` derives the next step
from `workflowModuleKeys(modules, loanType)`; if any *preceding* module omits
loanType, the gated module is computed as not-applicable and silently skipped
in the Save & Continue flow.

**Why:** the module immediately before the gated one varies by applicant
category (pan / documents / business / employment can all precede it), so it is
not enough to thread loanType through one route — miss any one and the workflow
jumps over the new module for some cases.

**How to apply:** when adding/editing a gated module, grep `nextModuleRoute(`
across `src/routes/` and confirm each passes
`st.activeCaseId ? st.cases[st.activeCaseId]?.loanType : undefined`. Same for
`isModuleApplicable` in workspace, module-top-bar (progress %), and report
(REPORT_MODULES verdict aggregation + ModuleGroupedSections). TS Record<ModuleKey>
maps enforce exhaustiveness for MODULE_ROUTE/MODULE_META/MODULE_ROW_BUILDERS.
