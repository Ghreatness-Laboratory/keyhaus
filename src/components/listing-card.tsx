"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Heart, Home, MapPin, ShieldCheck } from "lucide-react";
import { toggleSavedListingAction } from "@/app/actions/interactions";
import { PROPERTY_TYPES } from "@/lib/constants";
import { formatNeighborhoodSummary } from "@/lib/neighborhood";
import { formatNaira } from "@/lib/nigeria";
import { cn } from "@/lib/utils";
import type { ListingCardData } from "@/types/database";

export function ListingCard({
  listing,
  isSignedIn,
}: {
  listing: ListingCardData;
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(Boolean(listing.is_saved));
  const [imgFailed, setImgFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const typeLabel =
    PROPERTY_TYPES.find((p) => p.value === listing.property_type)?.label ?? "Home";

  const summaryChip = listing.environment
    ? formatNeighborhoodSummary(listing.environment)
    : null;

  const handleToggleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSignedIn) {
      router.push(`/auth/signin?next=/listing/${listing.id}`);
      return;
    }

    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await toggleSavedListingAction(listing.id);
      if (!res.ok) {
        setSaved(!next);
      } else if (res.data) {
        setSaved(res.data.saved);
      }
    });
  };

  const thumbUrl = listing.cover_thumb_path ?? listing.cover_path;

  return (
    <article className="group overflow-hidden rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white transition-colors hover:border-[#0E6B5B]/40">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#DDEEE9]">
        <Link href={`/listing/${listing.id}`} className="block h-full w-full">
          {thumbUrl && !imgFailed ? (
            <img
              src={thumbUrl}
              alt={`${listing.title} in ${listing.area}, ${listing.state}`}
              width={480}
              height={360}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#DDEEE9] text-[#0E6B5B]">
              <Home className="h-8 w-8" strokeWidth={2} />
              <span className="text-xs font-medium">{typeLabel}</span>
            </div>
          )}
        </Link>

        {listing.room_count > 0 && (
          <Link
            href={`/listing/${listing.id}/tour`}
            className="absolute left-3 top-3 inline-flex min-h-[34px] items-center gap-1.5 rounded-full bg-[#17211F]/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm hover:bg-[#0E6B5B]"
          >
            <Eye className="h-3.5 w-3.5 text-[#E3A93B]" strokeWidth={2} />
            <span>Walk-through</span>
          </Link>
        )}

        <button
          type="button"
          onClick={handleToggleSave}
          disabled={isPending}
          aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
          aria-pressed={saved}
          className="absolute right-2.5 top-2.5 inline-flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white/95 text-[#17211F] shadow-sm transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-[#0E6B5B] cursor-pointer"
        >
          <Heart
            className={cn(
              "h-5 w-5",
              saved ? "fill-[#0E6B5B] text-[#0E6B5B]" : "text-[#17211F]"
            )}
            strokeWidth={2}
          />
        </button>
      </div>

      <Link href={`/listing/${listing.id}`} className="block p-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-heading text-lg font-bold text-[#17211F] tabular-nums">
            {formatNaira(listing.rent_amount)}
            <span className="text-xs font-normal text-[#5B6663]">
              /{listing.rent_period === "month" ? "mo" : "yr"}
            </span>
          </p>
          {summaryChip && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#DDEEE9] px-2.5 py-1 text-xs font-semibold text-[#0E6B5B]">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} />
              <span>{summaryChip}</span>
            </span>
          )}
        </div>

        <h3 className="mt-1.5 line-clamp-1 font-heading text-base font-semibold text-[#17211F]">
          {listing.title}
        </h3>

        <p className="mt-1 flex items-center gap-1 text-xs text-[#5B6663]">
          <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="truncate">
            {listing.area} · {listing.lga}, {listing.state}
          </span>
        </p>

        <div className="mt-2.5 flex items-center gap-2 text-xs text-[#5B6663] tabular-nums">
          <span>{typeLabel}</span>
          <span aria-hidden="true">·</span>
          <span>
            {listing.bedrooms} {listing.bedrooms === 1 ? "bed" : "beds"}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {listing.bathrooms} {listing.bathrooms === 1 ? "bath" : "baths"}
          </span>
          {listing.furnished && (
            <>
              <span aria-hidden="true">·</span>
              <span>Furnished</span>
            </>
          )}
        </div>
      </Link>
    </article>
  );
}
