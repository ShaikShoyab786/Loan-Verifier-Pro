import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "@/components/placeholder";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings — VerifyPro" }] }),
  component: () => (
    <Placeholder
      title="Settings"
      description="Manage your profile, preferences and notification rules."
    />
  ),
});
