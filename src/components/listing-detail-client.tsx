"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Box,
  CalendarClock,
  Check,
  Compass,
  Eye,
  Flag,
  Heart,
  Home,
  Images,
  Layers,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Satellite,
  ShieldAlert,
  UserCheck,
} from "lucide-react";
import {
  reportListingAction,
  requestViewingAction,
  toggleSavedListingAction,
} from "@/app/actions/interactions";
import { NeighborhoodReport } from "@/components/neighborhood-report";
import { useOnlineStatus } from "@/components/pwa-manager";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlueprintFloorPlanViewer } from "@/components/viewers/blueprint-floor-plan";
import { AMENITIES, PROPERTY_TYPES, TIME_WINDOWS } from "@/lib/constants";
import {
  buildTelUrl,
  buildWhatsAppUrl,
  calculateMoveInTotal,
  formatDateNG,
  formatNaira,
} from "@/lib/nigeria";
import { cn } from "@/lib/utils";
import type { ListingDetailData, ViewingModeFlags } from "@/types/database";

const AreaSatelliteView = dynamic(
  () => import("@/components/viewers/area-satellite-view"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white text-sm text-[#5B6663]">
        Loading Satellite Area View...
      </div>
    ),
  }
);

const StreetViewPanel = dynamic(
  () => import("@/components/viewers/street-view-panel"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white text-sm text-[#5B6663]">
        Loading Street View...
      </div>
    ),
  }
);

const Listing3dView = dynamic(
  () => import("@/components/viewers/listing-3d-view"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[340px] items-center justify-center rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white text-sm text-[#5B6663]">
        Loading 3D View...
      </div>
    ),
  }
);

type ViewingTab = "photos" | "area" | "street" | "plan" | "view3d";

export function ListingDetailClient({
  detail,
  isSignedIn,
  currentUserId,
  isAdmin = false,
  viewingModeFlags,
}: {
  detail: ListingDetailData;
  isSignedIn: boolean;
  currentUserId: string | null;
  isAdmin?: boolean;
  viewingModeFlags: ViewingModeFlags;
}) {
  const router = useRouter();
  const isOnline = useOnlineStatus();
  const { listing, environment, rooms, roomLinks, landlord } = detail;

  const [saved, setSaved] = useState(detail.isSaved);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<ViewingTab>("photos");
  const [viewingOpen, setViewingOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const [preferredDate, setPreferredDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [timeWindow, setTimeWindow] = useState<string>(TIME_WINDOWS[0]);
  const [viewingNote, setViewingNote] = useState("");
  const [viewingFeedback, setViewingFeedback] = useState<string | null>(null);
  const [viewingRequest, setViewingRequest] = useState(detail.myViewingRequest);

  const [reportReason, setReportReason] = useState("");
  const [reportFeedback, setReportFeedback] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();

  const isOwner = currentUserId === listing.landlord_id;
  const typeLabel =
    PROPERTY_TYPES.find((p) => p.value === listing.property_type)?.label ?? "Home";

  const moveInTotal = calculateMoveInTotal({
    rentAmount: listing.rent_amount,
    agencyFee: listing.agency_fee,
    legalFee: listing.legal_fee,
    cautionFee: listing.caution_fee,
  });

  const galleryImages =
    rooms.length > 0
      ? rooms.map((r) => ({
          id: r.id,
          src: r.photo_path,
          alt: `${r.name}, ${listing.title}`,
          name: r.name,
          width: r.width,
          height: r.height,
        }))
      : listing.cover_path
        ? [
            {
              id: "cover",
              src: listing.cover_path,
              alt: listing.title,
              name: "Cover photo",
              width: 1200,
              height: 900,
            },
          ]
        : [];

  const activeImage = galleryImages[activePhotoIdx] ?? galleryImages[0];

  const handleToggleSave = () => {
    if (!isOnline) return;
    if (!isSignedIn) {
      router.push(`/auth/signin?next=/listing/${listing.id}`);
      return;
    }
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const res = await toggleSavedListingAction(listing.id);
      if (!res.ok) setSaved(!next);
    });
  };

  const handleRequestViewing = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) return;
    if (!isSignedIn) {
      router.push(`/auth/signin?next=/listing/${listing.id}`);
      return;
    }
    setViewingFeedback(null);
    startTransition(async () => {
      const res = await requestViewingAction({
        listing_id: listing.id,
        preferred_date: preferredDate,
        time_window: timeWindow,
        note: viewingNote,
      });
      if (!res.ok) {
        setViewingFeedback(res.error ?? "Could not send request.");
        return;
      }
      setViewingRequest({
        id: "submitted",
        listing_id: listing.id,
        renter_id: currentUserId ?? "",
        preferred_date: preferredDate,
        time_window: timeWindow,
        note: viewingNote || null,
        status: "pending",
        created_at: new Date().toISOString(),
      });
      setViewingFeedback("Viewing request sent to the landlord.");
    });
  };

  const handleSubmitReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOnline) return;
    if (!isSignedIn) {
      router.push(`/auth/signin?next=/listing/${listing.id}`);
      return;
    }
    setReportFeedback(null);
    startTransition(async () => {
      const res = await reportListingAction({
        listing_id: listing.id,
        reason: reportReason,
      });
      if (!res.ok) {
        setReportFeedback(res.error ?? "Could not submit report.");
        return;
      }
      setReportReason("");
      setReportFeedback("Thank you. Our team will review this report.");
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top back bar */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/explore"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-[1.5px] border-[#E2DFD6] bg-white px-4 text-sm font-medium text-[#17211F] hover:bg-[#DDEEE9]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          <span>Explore</span>
        </Link>

        <button
          type="button"
          onClick={handleToggleSave}
          disabled={!isOnline || isPending}
          aria-pressed={saved}
          aria-label={saved ? "Remove from saved" : "Save this place"}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-[1.5px] border-[#E2DFD6] bg-white px-4 text-sm font-medium text-[#17211F] hover:bg-[#DDEEE9] disabled:opacity-50 cursor-pointer"
        >
          <Heart
            className={cn(
              "h-4 w-4",
              saved ? "fill-[#0E6B5B] text-[#0E6B5B]" : "text-[#17211F]"
            )}
            strokeWidth={2}
          />
          <span>{!isOnline ? "Offline" : saved ? "Saved" : "Save"}</span>
        </button>
      </div>

      {/* Media & Viewing Modes */}
      {(() => {
        const hasApproxCoords =
          typeof listing.approx_latitude === "number" &&
          typeof listing.approx_longitude === "number";
        const showAreaTab = viewingModeFlags.areaView && hasApproxCoords;
        const showStreetTab =
          viewingModeFlags.streetView &&
          (hasApproxCoords || Boolean(detail.exactLocation));
        const showPlanTab =
          viewingModeFlags.floorPlan2d &&
          (Boolean(detail.floorPlan) || isOwner || isAdmin);
        const show3dTab =
          viewingModeFlags.view3d &&
          (rooms.some((r) => r.kind === "panorama") ||
            Boolean(listing.matterport_url) ||
            galleryImages.length > 0);

        const availableTabs: Array<{
          id: ViewingTab;
          label: string;
          icon: typeof Images;
        }> = [
          { id: "photos", label: "Photos", icon: Images },
          ...(showAreaTab
            ? [{ id: "area" as const, label: "Area View", icon: Satellite }]
            : []),
          ...(showStreetTab
            ? [{ id: "street" as const, label: "Street View", icon: Eye }]
            : []),
          ...(showPlanTab
            ? [{ id: "plan" as const, label: "2D Plan", icon: Layers }]
            : []),
          ...(show3dTab
            ? [{ id: "view3d" as const, label: "3D View", icon: Box }]
            : []),
        ];

        const currentTab = availableTabs.some((t) => t.id === activeTab)
          ? activeTab
          : "photos";

        return (
          <section aria-label="Property viewing modes" className="space-y-3">
            {availableTabs.length > 1 && (
              <Tabs
                value={currentTab}
                onValueChange={(val) => setActiveTab(val as ViewingTab)}
              >
                <TabsList className="flex w-full justify-start gap-1 overflow-x-auto">
                  {availableTabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="shrink-0 gap-1.5 px-3 text-xs sm:text-sm"
                      >
                        <Icon className="h-4 w-4" strokeWidth={2} />
                        <span>{tab.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </Tabs>
            )}

            {currentTab === "photos" && (
              <div className="space-y-3">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-[#DDEEE9]">
                  {activeImage ? (
                    <img
                      src={activeImage.src}
                      alt={activeImage.alt}
                      width={activeImage.width}
                      height={activeImage.height}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#0E6B5B]">
                      <Home className="h-10 w-10" strokeWidth={2} />
                    </div>
                  )}
                  {activeImage && (
                    <span className="absolute bottom-3 left-3 rounded-full bg-[#17211F]/80 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      {activeImage.name}
                    </span>
                  )}
                </div>

                {galleryImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setActivePhotoIdx(idx)}
                        className={cn(
                          "relative h-16 w-24 shrink-0 overflow-hidden rounded-[14px] border-2 transition-all cursor-pointer",
                          idx === activePhotoIdx
                            ? "border-[#0E6B5B]"
                            : "border-transparent opacity-75 hover:opacity-100"
                        )}
                      >
                        <img
                          src={img.src}
                          alt={img.alt}
                          width={160}
                          height={120}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {currentTab === "area" &&
              typeof listing.approx_latitude === "number" &&
              typeof listing.approx_longitude === "number" && (
                <AreaSatelliteView
                  area={listing.area}
                  lga={listing.lga}
                  state={listing.state}
                  approxLatitude={listing.approx_latitude}
                  approxLongitude={listing.approx_longitude}
                />
              )}

            {currentTab === "street" && (
              <StreetViewPanel
                listingTitle={listing.title}
                area={listing.area}
                canViewExactLocation={detail.canViewExactLocation}
                exactLatitude={detail.exactLocation?.latitude ?? null}
                exactLongitude={detail.exactLocation?.longitude ?? null}
              />
            )}

            {currentTab === "plan" && (
              <BlueprintFloorPlanViewer
                listingId={listing.id}
                listingTitle={listing.title}
                initialFloorPlan={detail.floorPlan}
                canGenerate={isOwner || isAdmin}
                isAdmin={isAdmin}
              />
            )}

            {currentTab === "view3d" && (
              <Listing3dView
                listingId={listing.id}
                listingTitle={listing.title}
                rooms={rooms}
                roomLinks={roomLinks}
                depthMaps={detail.depthMaps}
                matterportUrl={listing.matterport_url}
                activePhotoUrl={activeImage?.src ?? null}
                activePhotoLabel={activeImage?.name ?? listing.title}
                canGenerateDepth={isOwner || isAdmin}
              />
            )}
          </section>
        );
      })()}

      {/* Primary Tour CTA + Rent & Move-in Summary */}
      <section className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="font-heading text-2xl font-bold text-[#17211F] tabular-nums">
              {formatNaira(listing.rent_amount)}
              <span className="text-sm font-normal text-[#5B6663]">
                {" "}
                / {listing.rent_period}
              </span>
            </p>
            <p className="mt-0.5 text-sm font-medium text-[#0E6B5B] tabular-nums">
              Estimated total to move in: {formatNaira(moveInTotal)}
            </p>
          </div>
          <span className="rounded-full bg-[#DDEEE9] px-3 py-1 text-xs font-semibold text-[#0E6B5B]">
            {typeLabel}
          </span>
        </div>

        {(listing.agency_fee || listing.legal_fee || listing.caution_fee) && (
          <div className="grid grid-cols-3 gap-2 rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-[#F6F4EF] p-3 text-xs tabular-nums">
            <div>
              <p className="text-[#5B6663]">Agency fee</p>
              <p className="mt-0.5 font-semibold text-[#17211F]">
                {listing.agency_fee ? formatNaira(listing.agency_fee) : "None"}
              </p>
            </div>
            <div>
              <p className="text-[#5B6663]">Legal fee</p>
              <p className="mt-0.5 font-semibold text-[#17211F]">
                {listing.legal_fee ? formatNaira(listing.legal_fee) : "None"}
              </p>
            </div>
            <div>
              <p className="text-[#5B6663]">Caution deposit</p>
              <p className="mt-0.5 font-semibold text-[#17211F]">
                {listing.caution_fee ? formatNaira(listing.caution_fee) : "None"}
              </p>
            </div>
          </div>
        )}

        <div>
          <h1 className="font-heading text-xl font-bold text-[#17211F] text-balance">
            {listing.title}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[#5B6663]">
            <MapPin className="h-4 w-4 shrink-0 text-[#0E6B5B]" strokeWidth={2} />
            <span>
              {listing.area}, {listing.lga}, {listing.state}
            </span>
          </p>
        </div>

        {/* Private Street Address Reveal */}
        <div className="rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-[#F6F4EF] p-3.5 text-sm">
          {detail.revealedAddress ? (
            <div className="flex items-start gap-2.5">
              <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0E6B5B]" strokeWidth={2} />
              <div>
                <p className="text-xs font-semibold text-[#0E6B5B]">
                  {isOwner ? "Your street address" : "Unlocked street address"}
                </p>
                <p className="mt-0.5 font-medium text-[#17211F]">
                  {detail.revealedAddress}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 text-[#5B6663]">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} />
              <p className="text-xs">
                Exact street address stays private until the landlord accepts your
                viewing request.
              </p>
            </div>
          )}
        </div>

        {rooms.length > 0 && (
          <Button asChild size="lg" className="w-full">
            <Link href={`/listing/${listing.id}/tour`}>
              <Compass className="h-5 w-5 text-[#E3A93B]" strokeWidth={2} />
              <span>Walk through this place ({rooms.length} rooms)</span>
            </Link>
          </Button>
        )}
      </section>

      {/* Specs & Description */}
      <section className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-[#17211F] tabular-nums">
          <span>
            {listing.bedrooms} {listing.bedrooms === 1 ? "bedroom" : "bedrooms"}
          </span>
          <span aria-hidden="true" className="text-[#5B6663]">
            ·
          </span>
          <span>
            {listing.bathrooms} {listing.bathrooms === 1 ? "bathroom" : "bathrooms"}
          </span>
          {typeof listing.size_sqm === "number" && listing.size_sqm > 0 && (
            <>
              <span aria-hidden="true" className="text-[#5B6663]">
                ·
              </span>
              <span>{listing.size_sqm} sqm</span>
            </>
          )}
          <span aria-hidden="true" className="text-[#5B6663]">
            ·
          </span>
          <span>{listing.furnished ? "Furnished" : "Unfurnished"}</span>
        </div>

        <p className="whitespace-pre-line text-sm leading-relaxed text-[#17211F]">
          {listing.description}
        </p>

        {listing.amenities.length > 0 && (
          <div className="space-y-2 border-t-[1.5px] border-[#E2DFD6] pt-4">
            <p className="font-heading text-sm font-semibold text-[#17211F]">
              Included features
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {listing.amenities.map((code) => {
                const label =
                  AMENITIES.find((a) => a.value === code)?.label ?? code;
                return (
                  <div key={code} className="flex items-center gap-2 text-[#17211F]">
                    <Check className="h-4 w-4 shrink-0 text-[#0E6B5B]" strokeWidth={2} />
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Honest Neighborhood & Environment Report */}
      {environment && <NeighborhoodReport environment={environment} />}

      {/* Scam Safety Banner */}
      <section
        aria-label="Rental safety notice"
        className="rounded-[20px] border-[1.5px] border-[#E3A93B] bg-[#FBF4E4] p-4"
      >
        <div className="flex items-start gap-3">
          <ShieldAlert
            className="mt-0.5 h-5 w-5 shrink-0 text-[#9B6B0A]"
            strokeWidth={2}
          />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-[#17211F]">
              Never pay before you inspect the home and meet the landlord. Keyhaus
              does not take payments.
            </p>
            <Link
              href="/safety"
              className="inline-block text-xs font-semibold text-[#0E6B5B] underline underline-offset-4"
            >
              Read our Nigeria rental safety guide
            </Link>
          </div>
        </div>
      </section>

      {/* Landlord Profile + Report Button */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-5">
        <div>
          <p className="text-xs text-[#5B6663]">Listed by</p>
          <p className="font-heading text-base font-bold text-[#17211F]">
            {landlord?.full_name ?? "Verified Landlord"}
          </p>
          <p className="text-xs text-[#5B6663]">
            Member since {landlord ? formatDateNG(landlord.created_at) : "2026"}
          </p>
        </div>

        <Dialog open={reportOpen} onOpenChange={setReportOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!isOnline}>
              <Flag className="h-4 w-4" strokeWidth={2} />
              <span>Report inaccurate info</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report inaccurate information</DialogTitle>
              <DialogDescription>
                Let us know if the rent, photos, or neighborhood report does not match
                reality.
              </DialogDescription>
            </DialogHeader>
            {!isSignedIn ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-[#5B6663]">
                  Sign in to submit an accuracy report.
                </p>
                <Button asChild className="w-full">
                  <Link href={`/auth/signin?next=/listing/${listing.id}`}>
                    Sign in to report
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="report-reason">What is inaccurate?</Label>
                  <Textarea
                    id="report-reason"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="e.g. Photos are from another compound, or road is untarred and flooded."
                    required
                    minLength={10}
                    maxLength={500}
                  />
                </div>
                {reportFeedback && (
                  <p className="text-sm font-medium text-[#0E6B5B]">
                    {reportFeedback}
                  </p>
                )}
                <Button type="submit" disabled={isPending} className="w-full">
                  {isPending ? "Sending..." : "Submit report"}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </section>

      {/* Sticky Bottom Action Bar */}
      {!isOwner && (
        <div className="fixed inset-x-0 bottom-[72px] z-30 border-t-[1.5px] border-[#E2DFD6] bg-white/95 px-6 py-3 backdrop-blur-sm md:bottom-0">
          <div className="mx-auto flex max-w-[720px] items-center gap-3">
            {/* Request Viewing Sheet */}
            <Dialog open={viewingOpen} onOpenChange={setViewingOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1" disabled={!isOnline}>
                  <CalendarClock className="h-4 w-4" strokeWidth={2} />
                  <span>
                    {!isOnline
                      ? "You are offline"
                      : viewingRequest
                        ? `Viewing ${viewingRequest.status}`
                        : "Request viewing"}
                  </span>
                </Button>
              </DialogTrigger>
              <DialogContent variant="sheet">
                <DialogHeader>
                  <DialogTitle>Request an in-person viewing</DialogTitle>
                  <DialogDescription>
                    Pick a day and time window to inspect {listing.title}.
                  </DialogDescription>
                </DialogHeader>

                {!isSignedIn ? (
                  <div className="mt-5 space-y-3">
                    <p className="text-sm text-[#5B6663]">
                      Sign in so the landlord knows who is requesting to visit.
                    </p>
                    <Button asChild className="w-full">
                      <Link href={`/auth/signin?next=/listing/${listing.id}`}>
                        Sign in to request viewing
                      </Link>
                    </Button>
                  </div>
                ) : viewingRequest ? (
                  <div className="mt-5 space-y-3 rounded-[18px] border-[1.5px] border-[#E2DFD6] bg-white p-4">
                    <p className="font-heading text-sm font-bold text-[#17211F]">
                      Request status:{" "}
                      <span className="capitalize text-[#0E6B5B]">
                        {viewingRequest.status}
                      </span>
                    </p>
                    <p className="text-sm text-[#5B6663]">
                      Preferred date: {formatDateNG(viewingRequest.preferred_date)} ·{" "}
                      {viewingRequest.time_window}
                    </p>
                    {viewingFeedback && (
                      <p className="text-sm font-medium text-[#0E6B5B]">
                        {viewingFeedback}
                      </p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleRequestViewing} className="mt-5 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="viewing-date">Preferred date</Label>
                      <Input
                        id="viewing-date"
                        type="date"
                        value={preferredDate}
                        onChange={(e) => setPreferredDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="viewing-window">Time window</Label>
                      <select
                        id="viewing-window"
                        value={timeWindow}
                        onChange={(e) => setTimeWindow(e.target.value)}
                        className="min-h-[44px] w-full rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-white px-3 text-sm text-[#17211F]"
                      >
                        {TIME_WINDOWS.map((win) => (
                          <option key={win} value={win}>
                            {win}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="viewing-note">Note for landlord (optional)</Label>
                      <Textarea
                        id="viewing-note"
                        value={viewingNote}
                        onChange={(e) => setViewingNote(e.target.value)}
                        placeholder="e.g. I work nearby and can arrive by 10am."
                        maxLength={300}
                      />
                    </div>
                    {viewingFeedback && (
                      <p className="text-sm font-medium text-[#B3261E]">
                        {viewingFeedback}
                      </p>
                    )}
                    <Button type="submit" disabled={isPending} className="w-full">
                      {isPending ? "Sending..." : "Send viewing request"}
                    </Button>
                  </form>
                )}
              </DialogContent>
            </Dialog>

            {/* Contact Landlord Dialog */}
            <Dialog open={contactOpen} onOpenChange={setContactOpen}>
              <DialogTrigger asChild>
                <Button variant="secondary" className="flex-1">
                  <Phone className="h-4 w-4" strokeWidth={2} />
                  <span>Contact landlord</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Contact landlord</DialogTitle>
                  <DialogDescription>
                    Call or message {landlord?.full_name ?? "the landlord"} directly.
                  </DialogDescription>
                </DialogHeader>
                {!isSignedIn ? (
                  <div className="mt-4 space-y-3">
                    <p className="text-sm text-[#5B6663]">
                      Phone numbers are hidden from signed-out visitors to protect
                      landlords from spam. Sign in to call or open WhatsApp.
                    </p>
                    <Button asChild className="w-full">
                      <Link href={`/auth/signin?next=/listing/${listing.id}`}>
                        Sign in to see phone number
                      </Link>
                    </Button>
                  </div>
                ) : detail.landlordPhone ? (
                  <div className="mt-4 space-y-3">
                    <div className="rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-[#F6F4EF] p-3.5">
                      <p className="text-xs text-[#5B6663]">Landlord phone</p>
                      <p className="mt-0.5 font-heading text-lg font-bold text-[#17211F] tabular-nums">
                        {detail.landlordPhone}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button asChild variant="outline">
                        <a href={buildTelUrl(detail.landlordPhone)}>
                          <Phone className="h-4 w-4" strokeWidth={2} />
                          <span>Call</span>
                        </a>
                      </Button>
                      <Button asChild>
                        <a
                          href={buildWhatsAppUrl(detail.landlordPhone, listing.title)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="h-4 w-4" strokeWidth={2} />
                          <span>WhatsApp</span>
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[#5B6663]">
                    This landlord has not added a phone number yet. Request a viewing
                    above to connect.
                  </p>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  );
}
