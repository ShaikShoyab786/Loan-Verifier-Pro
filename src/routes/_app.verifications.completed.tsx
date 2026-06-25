import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/placeholder";

export const Route = createFileRoute("/_app/verifications/completed")({
  head: () => ({ meta: [{ title: "Completed Verifications — VerifyPro" }] }),
  component: () => (
    <Placeholder
      title="Completed Verifications"
      description="Review verifications you've successfully closed."
    />
  ),
});
