import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ListingDetailClient } from "@/components/listing-detail-client";
import { getCurrentSession, getListingDetail } from "@/lib/data/queries";
import { getViewingModeFlags } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [session, detail] = await Promise.all([
    getCurrentSession(),
    getListingDetail(id),
  ]);

  if (!detail) {
    notFound();
  }

  const viewingModeFlags = getViewingModeFlags();

  return (
    <AppShell
      role={session.profile?.role ?? null}
      isSignedIn={Boolean(session.userId)}
    >
      <ListingDetailClient
        detail={detail}
        isSignedIn={Boolean(session.userId)}
        currentUserId={session.userId}
        isAdmin={Boolean(session.profile?.is_admin)}
        viewingModeFlags={viewingModeFlags}
      />
    </AppShell>
  );
}
