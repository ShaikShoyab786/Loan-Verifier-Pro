import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FillTestDataButtonProps {
  onFill: () => void;
  label?: string;
  className?: string;
}

export function FillTestDataButton({
  onFill,
  label = "Fill Test Data",
  className,
}: FillTestDataButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn(
        "h-8 gap-1.5 text-xs font-medium border-dashed border-amber-500/40 text-amber-700 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-500/60 dark:text-amber-400 dark:hover:bg-amber-950/30",
        className,
      )}
      onClick={onFill}
    >
      <FlaskConical className="h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
