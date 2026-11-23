import Link from "next/link";
import { Heart } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { getCurrentSession, getSavedListings } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const session = await getCurrentSession();
  const items = session.userId ? await getSavedListings() : [];

  return (
    <AppShell
      role={session.profile?.role ?? null}
      isSignedIn={Boolean(session.userId)}
      isWideBrowse={items.length > 0}
    >
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#17211F]">Saved places</h1>
          <p className="mt-1 text-sm text-[#5B6663]">
            Homes you bookmarked to compare or tour later.
          </p>
        </div>

        {!session.userId ? (
          <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-8 text-center space-y-3">
            <Heart className="mx-auto h-8 w-8 text-[#0E6B5B]" strokeWidth={2} />
            <p className="font-heading text-lg font-semibold text-[#17211F]">
              Sign in to view your saved homes
            </p>
            <p className="text-sm text-[#5B6663]">
              Keep your favourite flats and houses synced across visits.
            </p>
            <Button asChild>
              <Link href="/auth/signin?next=/saved">Sign in</Link>
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-8 text-center space-y-3">
            <Heart className="mx-auto h-8 w-8 text-[#5B6663]" strokeWidth={2} />
            <p className="font-heading text-lg font-semibold text-[#17211F]">
              No saved places yet
            </p>
            <p className="text-sm text-[#5B6663]">
              Tap the heart on any home in Explore to save it here.
            </p>
            <Button asChild variant="outline">
              <Link href="/explore">Explore homes</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ListingCard key={item.id} listing={item} isSignedIn />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
