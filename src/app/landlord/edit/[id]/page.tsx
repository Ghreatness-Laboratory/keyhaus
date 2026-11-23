import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LandlordWizardClient } from "@/components/landlord-wizard-client";
import { getCurrentSession, getListingDetail } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function LandlordEditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, detail] = await Promise.all([
    getCurrentSession(),
    getListingDetail(id),
  ]);

  if (!session.userId) {
    redirect(`/auth/signin?next=/landlord/edit/${id}`);
  }
  if (session.profile?.role !== "landlord") {
    redirect("/onboarding/role");
  }
  if (!detail || detail.listing.landlord_id !== session.userId) {
    notFound();
  }

  return (
    <AppShell role="landlord" isSignedIn>
      <LandlordWizardClient
        userId={session.userId}
        initialListing={{
          ...detail.listing,
          address_line: detail.revealedAddress ?? "",
        }}
        initialEnvironment={detail.environment}
        initialRooms={detail.rooms}
        initialRoomLinks={detail.roomLinks}
      />
    </AppShell>
  );
}
