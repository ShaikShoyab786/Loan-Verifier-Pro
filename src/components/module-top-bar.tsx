import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  MODULE_KEYS,
  isModuleApplicable,
  useVerificationStore,
} from "@/lib/verification-store";

/**
 * Compact, non-sticky page-header row shown above each verification module:
 * Workspace link · Case ID · Progress %. Renders as a normal block element
 * so it doesn't add any extra sticky overlay or vertical whitespace.
 */
export function ModuleTopBar() {
  const activeCaseId = useVerificationStore((s) => s.activeCaseId);
  const activeApplicantId = useVerificationStore((s) => s.activeApplicantId);
  const moduleState = useVerificationStore((s) => s.modules[activeApplicantId]);
  const loanType = useVerificationStore((s) =>
    s.activeCaseId ? s.cases[s.activeCaseId]?.loanType : undefined,
  );

  const applicableKeys = MODULE_KEYS.filter((k) => isModuleApplicable(moduleState, k, loanType));
  const completedCount = applicableKeys.filter(
    (k) => moduleState?.[k]?.status === "completed",
  ).length;
  const pct = applicableKeys.length
    ? Math.round((completedCount / applicableKeys.length) * 100)
    : 0;

  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0 text-sm">
      <Link
        to="/verifications/workspace"
        className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Workspace</span>
      </Link>
      {activeCaseId ? (
        <>
          <span className="text-border shrink-0">•</span>
          <span className="font-mono text-[11px] sm:text-xs font-semibold text-primary truncate min-w-0">
            {activeCaseId}
          </span>
        </>
      ) : null}
      <span className="ml-auto shrink-0 text-[11px] sm:text-xs font-semibold tabular-nums px-2 py-0.5 rounded-md bg-primary/10 text-primary">
        {pct}%
      </span>
    </div>
  );
}
