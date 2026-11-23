"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Clock, Inbox, X, XCircle } from "lucide-react";
import { respondViewingRequestAction } from "@/app/actions/interactions";
import type { LandlordRequestItem } from "@/lib/data/queries";
import { formatDateNG } from "@/lib/nigeria";
import { Button } from "@/components/ui/button";

export function LandlordRequestsClient({
  items,
}: {
  items: LandlordRequestItem[];
}) {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const grouped = items.reduce<
    Record<string, { title: string; area: string; requests: LandlordRequestItem[] }>
  >((acc, item) => {
    if (!acc[item.listingId]) {
      acc[item.listingId] = {
        title: item.listingTitle,
        area: item.listingArea,
        requests: [],
      };
    }
    acc[item.listingId].requests.push(item);
    return acc;
  }, {});

  const handleRespond = (requestId: string, status: "accepted" | "declined") => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await respondViewingRequestAction(requestId, status);
      if (!res.ok) {
        setErrorMsg(res.error ?? "Could not update viewing request.");
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#17211F]">
          Viewing requests
        </h1>
        <p className="mt-1 text-sm text-[#5B6663]">
          Accepting reveals your private street address to that renter.
        </p>
      </div>

      {errorMsg && (
        <p role="alert" className="text-sm font-medium text-[#B3261E]">
          {errorMsg}
        </p>
      )}

      {items.length === 0 ? (
        <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-8 text-center space-y-2">
          <Inbox className="mx-auto h-8 w-8 text-[#5B6663]" strokeWidth={2} />
          <p className="font-heading text-lg font-semibold text-[#17211F]">
            No viewing requests yet
          </p>
          <p className="text-sm text-[#5B6663]">
            Requests from renters will appear here grouped by listing.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([listingId, group]) => (
            <section
              key={listingId}
              className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-5 space-y-4"
            >
              <div className="border-b-[1.5px] border-[#E2DFD6] pb-3">
                <h2 className="font-heading text-base font-bold text-[#17211F]">
                  {group.title}
                </h2>
                <p className="text-xs text-[#5B6663]">{group.area}</p>
              </div>

              <div className="divide-y divide-[#E2DFD6]">
                {group.requests.map(({ request, renterName }) => (
                  <div
                    key={request.id}
                    className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-[#17211F]">
                          {renterName ?? "Renter"}
                        </p>
                        {request.status === "accepted" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#DDEEE9] px-2.5 py-0.5 text-xs font-semibold text-[#0E6B5B]">
                            <CheckCircle2 className="h-3 w-3" strokeWidth={2} />
                            Accepted
                          </span>
                        )}
                        {request.status === "pending" && (
                          <span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-[#E3A93B] bg-[#FBF4E4] px-2.5 py-0.5 text-xs font-semibold text-[#6E4D07]">
                            <Clock className="h-3 w-3" strokeWidth={2} />
                            Pending
                          </span>
                        )}
                        {request.status === "declined" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FBE9E7] px-2.5 py-0.5 text-xs font-semibold text-[#B3261E]">
                            <XCircle className="h-3 w-3" strokeWidth={2} />
                            Declined
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5B6663]">
                        {formatDateNG(request.preferred_date)} · {request.time_window}
                      </p>
                      {request.note && (
                        <p className="text-xs text-[#17211F]">
                          Note: {request.note}
                        </p>
                      )}
                    </div>

                    {request.status === "pending" && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleRespond(request.id, "accepted")}
                        >
                          <Check className="h-4 w-4" strokeWidth={2} />
                          <span>Accept</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isPending}
                          onClick={() => handleRespond(request.id, "declined")}
                        >
                          <X className="h-4 w-4" strokeWidth={2} />
                          <span>Decline</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
