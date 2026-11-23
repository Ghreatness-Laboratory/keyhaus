import { AppShell } from "@/components/app-shell";
import { ExploreClient } from "@/components/explore-client";
import { browseListings, getCurrentSession } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const [session, initial] = await Promise.all([
    getCurrentSession(),
    browseListings({ offset: 0 }),
  ]);

  return (
    <AppShell
      role={session.profile?.role ?? null}
      isSignedIn={Boolean(session.userId)}
      isWideBrowse
    >
      <ExploreClient
        initialItems={initial.items}
        initialHasMore={initial.hasMore}
        isSignedIn={Boolean(session.userId)}
      />
    </AppShell>
  );
}
