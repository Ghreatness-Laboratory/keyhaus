import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getCurrentSession, getRenterViewings } from "@/lib/data/queries";
import {
  buildTelUrl,
  buildWhatsAppUrl,
  formatDateNG,
  formatNaira,
} from "@/lib/nigeria";

export const dynamic = "force-dynamic";

export default async function RenterViewingsPage() {
  const session = await getCurrentSession();
  const items = session.userId ? await getRenterViewings() : [];

  return (
    <AppShell
      role={session.profile?.role ?? null}
      isSignedIn={Boolean(session.userId)}
    >
      <div className="space-y-5">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#17211F]">Viewings</h1>
          <p className="mt-1 text-sm text-[#5B6663]">
            Track your inspection requests and revealed street addresses.
          </p>
        </div>

        {!session.userId ? (
          <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-8 text-center space-y-3">
            <CalendarClock className="mx-auto h-8 w-8 text-[#0E6B5B]" strokeWidth={2} />
            <p className="font-heading text-lg font-semibold text-[#17211F]">
              Sign in to see your viewings
            </p>
            <Button asChild>
              <Link href="/auth/signin?next=/viewings">Sign in</Link>
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-8 text-center space-y-3">
            <CalendarClock className="mx-auto h-8 w-8 text-[#5B6663]" strokeWidth={2} />
            <p className="font-heading text-lg font-semibold text-[#17211F]">
              No viewing requests yet
            </p>
            <p className="text-sm text-[#5B6663]">
              Take a room-by-room tour first, then request an in-person inspection.
            </p>
            <Button asChild variant="outline">
              <Link href="/explore">Browse homes</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(({ request, listing, landlordName, landlordPhone, revealedAddress }) => (
              <article
                key={request.id}
                className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/listing/${listing.id}`}
                      className="font-heading text-base font-bold text-[#17211F] hover:text-[#0E6B5B]"
                    >
                      {listing.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-[#5B6663]">
                      {listing.area} · {listing.lga}, {listing.state} ·{" "}
                      <span className="tabular-nums font-medium text-[#17211F]">
                        {formatNaira(listing.rent_amount)}/{listing.rent_period}
                      </span>
                    </p>
                  </div>

                  {request.status === "accepted" && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#DDEEE9] px-3 py-1 text-xs font-semibold text-[#0E6B5B]">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                      Accepted
                    </span>
                  )}
                  {request.status === "pending" && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border-[1.5px] border-[#E3A93B] bg-[#FBF4E4] px-3 py-1 text-xs font-semibold text-[#6E4D07]">
                      <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                      Pending
                    </span>
                  )}
                  {request.status === "declined" && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FBE9E7] px-3 py-1 text-xs font-semibold text-[#B3261E]">
                      <XCircle className="h-3.5 w-3.5" strokeWidth={2} />
                      Declined
                    </span>
                  )}
                </div>

                <div className="text-sm text-[#17211F]">
                  <p>
                    <span className="text-[#5B6663]">Preferred date:</span>{" "}
                    {formatDateNG(request.preferred_date)} · {request.time_window}
                  </p>
                  {request.note && (
                    <p className="mt-1 text-xs text-[#5B6663]">
                      Your note: {request.note}
                    </p>
                  )}
                </div>

                {revealedAddress && (
                  <div className="rounded-[14px] border-[1.5px] border-[#0E6B5B]/30 bg-[#DDEEE9]/50 p-3.5 text-sm">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[#0E6B5B]">
                      <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                      Street address revealed
                    </p>
                    <p className="mt-0.5 font-medium text-[#17211F]">{revealedAddress}</p>
                  </div>
                )}

                {landlordPhone && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-[#E2DFD6] pt-3">
                    <p className="text-xs text-[#5B6663]">
                      Landlord: <span className="font-medium text-[#17211F]">{landlordName ?? "Owner"}</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <a href={buildTelUrl(landlordPhone)}>
                          <Phone className="h-4 w-4" strokeWidth={2} />
                          <span>Call</span>
                        </a>
                      </Button>
                      <Button asChild size="sm">
                        <a
                          href={buildWhatsAppUrl(landlordPhone, listing.title)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="h-4 w-4" strokeWidth={2} />
                          <span>WhatsApp</span>
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
