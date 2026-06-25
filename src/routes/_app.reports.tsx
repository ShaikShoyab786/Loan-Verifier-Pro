import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/placeholder";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — VerifyPro" }] }),
  component: () => (
    <Placeholder
      title="Reports"
      description="Generated due diligence reports will appear here."
    />
  ),
});
