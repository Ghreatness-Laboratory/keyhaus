"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Edit3,
  Eye,
  Plus,
  Trash2,
  UploadCloud,
  AlertTriangle,
} from "lucide-react";
import {
  deleteListingAction,
  publishListingAction,
  updateListingStatusAction,
} from "@/app/actions/listings";
import { useOnlineStatus } from "@/components/pwa-manager";
import { Button } from "@/components/ui/button";
import { MAX_PUBLISHED_LISTINGS_PER_LANDLORD } from "@/lib/constants";
import { formatNaira } from "@/lib/nigeria";
import { cn } from "@/lib/utils";
import type { ListingCardData, ListingStatus } from "@/types/database";

const STATUS_LABELS: Record<ListingStatus, string> = {
  draft: "Draft",
  published: "Published",
  rented: "Rented",
  archived: "Archived",
};

export function LandlordDashboardClient({
  listings,
  hasValidPhone,
}: {
  listings: ListingCardData[];
  hasValidPhone: boolean;
}) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const publishedCount = listings.filter((l) => l.status === "published").length;

  const handleStatusChange = (id: string, status: ListingStatus) => {
    if (!isOnline) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res =
        status === "published"
          ? await publishListingAction(id)
          : await updateListingStatusAction(id, status);
      if (!res.ok) {
        setErrorMsg(res.error ?? "Could not update listing.");
        return;
      }
      router.refresh();
    });
  };

  const handleDelete = (id: string, title: string) => {
    if (!isOnline) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await deleteListingAction(id);
      if (!res.ok) {
        setErrorMsg(res.error ?? `Could not delete ${title}.`);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#17211F]">My listings</h1>
          <p className="mt-0.5 text-sm text-[#5B6663] tabular-nums">
            {publishedCount} of {MAX_PUBLISHED_LISTINGS_PER_LANDLORD} published slots used
          </p>
        </div>

        <Button asChild disabled={!isOnline}>
          <Link href="/landlord/new">
            <Plus className="h-4 w-4" strokeWidth={2} />
            <span>Add listing</span>
          </Link>
        </Button>
      </div>

      {!hasValidPhone && (
        <div className="rounded-[20px] border-[1.5px] border-[#E3A93B] bg-[#FBF4E4] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-[#9B6B0A]"
              strokeWidth={2}
            />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-[#17211F]">
                Add your full name and Nigerian mobile number before publishing.
              </p>
              <Link
                href="/profile"
                className="inline-block text-xs font-semibold text-[#0E6B5B] underline underline-offset-4"
              >
                Update Profile
              </Link>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-[16px] border-[1.5px] border-[#B3261E]/35 bg-[#FBE9E7] p-3.5 text-sm font-medium text-[#B3261E]"
        >
          {errorMsg}
        </div>
      )}

      {listings.length === 0 ? (
        <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-8 text-center space-y-3">
          <p className="font-heading text-lg font-semibold text-[#17211F]">
            You have no listings yet
          </p>
          <p className="text-sm text-[#5B6663]">
            Create a listing in four steps: Details, Neighborhood, Rooms, and Preview.
          </p>
          <Button asChild>
            <Link href="/landlord/new">Create your first listing</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((item) => (
            <article
              key={item.id}
              className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-4 space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <img
                  src={
                    item.cover_thumb_path ??
                    item.cover_path ??
                    "/images/demo/living-lagos-thumb.webp"
                  }
                  alt={item.title}
                  width={120}
                  height={90}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-20 w-24 shrink-0 rounded-[14px] object-cover bg-[#DDEEE9]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        item.status === "published"
                          ? "bg-[#DDEEE9] text-[#0E6B5B]"
                          : item.status === "rented"
                            ? "border-[1.5px] border-[#E3A93B] bg-[#FBF4E4] text-[#6E4D07]"
                            : "bg-[#F6F4EF] text-[#5B6663]"
                      )}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                    <span className="text-xs text-[#5B6663] tabular-nums">
                      {item.room_count} {item.room_count === 1 ? "room" : "rooms"}
                    </span>
                  </div>
                  <h2 className="mt-1 truncate font-heading text-base font-bold text-[#17211F]">
                    {item.title}
                  </h2>
                  <p className="text-xs text-[#5B6663]">
                    {item.area}, {item.state} ·{" "}
                    <span className="font-semibold text-[#17211F] tabular-nums">
                      {formatNaira(item.rent_amount)}/{item.rent_period}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t-[1.5px] border-[#E2DFD6] pt-3">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/landlord/edit/${item.id}`}>
                    <Edit3 className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>Edit</span>
                  </Link>
                </Button>

                {item.status === "published" && (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/listing/${item.id}`}>
                      <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                      <span>View</span>
                    </Link>
                  </Button>
                )}

                {item.status !== "published" && (
                  <Button
                    size="sm"
                    disabled={isPending || !isOnline}
                    onClick={() => handleStatusChange(item.id, "published")}
                  >
                    <UploadCloud className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>Publish</span>
                  </Button>
                )}

                {item.status === "published" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={isPending || !isOnline}
                    onClick={() => handleStatusChange(item.id, "rented")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>Mark rented</span>
                  </Button>
                )}

                {item.status !== "archived" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending || !isOnline}
                    onClick={() => handleStatusChange(item.id, "archived")}
                  >
                    <Archive className="h-3.5 w-3.5" strokeWidth={2} />
                    <span>Archive</span>
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending || !isOnline}
                  onClick={() => handleDelete(item.id, item.title)}
                  className="ml-auto text-[#B3261E] hover:bg-[#FBE9E7]"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Delete</span>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
