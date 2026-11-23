import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LandlordDashboardClient } from "@/components/landlord-dashboard-client";
import { getCurrentSession, getLandlordListings } from "@/lib/data/queries";
import { isValidNigerianPhone } from "@/lib/nigeria";

export const dynamic = "force-dynamic";

export default async function LandlordPage() {
  const session = await getCurrentSession();
  if (!session.userId) {
    redirect("/auth/signin?next=/landlord");
  }
  if (session.profile?.role !== "landlord") {
    redirect("/onboarding/role");
  }

  const listings = await getLandlordListings();
  const hasValidPhone = Boolean(
    session.profile?.full_name &&
      session.profile?.phone &&
      isValidNigerianPhone(session.profile.phone)
  );

  return (
    <AppShell role="landlord" isSignedIn>
      <LandlordDashboardClient listings={listings} hasValidPhone={hasValidPhone} />
    </AppShell>
  );
}
