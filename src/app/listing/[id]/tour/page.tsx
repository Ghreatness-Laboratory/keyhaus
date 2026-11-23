import { notFound } from "next/navigation";
import { TourViewer } from "@/components/tour-viewer";
import { getListingDetail } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function ListingTourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getListingDetail(id);

  if (!detail) {
    notFound();
  }

  return (
    <TourViewer
      listingId={detail.listing.id}
      listingTitle={detail.listing.title}
      rooms={detail.rooms}
      roomLinks={detail.roomLinks}
    />
  );
}
