import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LandlordRequestsClient } from "@/components/landlord-requests-client";
import { getCurrentSession, getLandlordViewingRequests } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function LandlordRequestsPage() {
  const session = await getCurrentSession();
  if (!session.userId) {
    redirect("/auth/signin?next=/landlord/requests");
  }
  if (session.profile?.role !== "landlord") {
    redirect("/onboarding/role");
  }

  const items = await getLandlordViewingRequests();

  return (
    <AppShell role="landlord" isSignedIn>
      <LandlordRequestsClient items={items} />
    </AppShell>
  );
}
