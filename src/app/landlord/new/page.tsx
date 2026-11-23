import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LandlordWizardClient } from "@/components/landlord-wizard-client";
import { getCurrentSession } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function LandlordNewListingPage() {
  const session = await getCurrentSession();
  if (!session.userId) {
    redirect("/auth/signin?next=/landlord/new");
  }
  if (session.profile?.role !== "landlord") {
    redirect("/onboarding/role");
  }

  return (
    <AppShell role="landlord" isSignedIn>
      <LandlordWizardClient userId={session.userId} />
    </AppShell>
  );
}
