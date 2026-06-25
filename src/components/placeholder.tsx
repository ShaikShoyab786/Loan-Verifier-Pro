import { Construction } from "lucide-react";

export function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <Construction className="h-6 w-6" />
        </div>
        <p className="mt-4 text-sm font-medium">Coming soon</p>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
          This section is part of the application shell. Detailed views will be
          enabled in the next iteration.
        </p>
      </div>
    </div>
  );
}
