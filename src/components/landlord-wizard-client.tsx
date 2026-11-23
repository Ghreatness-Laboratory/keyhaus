"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Compass,
  GripVertical,
  Link2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  publishListingAction,
  saveListingDetailsAction,
  saveListingEnvironmentAction,
  saveListingRoomsAction,
  type RoomInputPayload,
  type RoomLinkInputPayload,
} from "@/app/actions/listings";
import { NeighborhoodReport } from "@/components/neighborhood-report";
import { TourViewer } from "@/components/tour-viewer";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Checkbox, Label } from "@/components/ui/label";
import {
  AMENITIES,
  BACKUP_POWER_OPTIONS,
  DESCRIPTION_MAX_CHARS,
  ENVIRONMENT_NOTE_MAX_CHARS,
  MAX_ROOMS_PER_LISTING,
  PROPERTY_TYPES,
  ROOM_NAME_PRESETS,
} from "@/lib/constants";
import {
  compressRoomImageOnDevice,
  fileToDataUrl,
} from "@/lib/image-compression";
import { getAllStates, getLgasForState } from "@/lib/locations";
import { calculateMoveInTotal, formatNaira } from "@/lib/nigeria";
import {
  listingDetailsSchema,
  listingEnvironmentSchema,
} from "@/lib/schemas";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, resolveListingPhotoUrl } from "@/lib/supabase/config";
import { cn } from "@/lib/utils";
import type {
  Listing,
  ListingEnvironment,
  Room,
  RoomLink,
} from "@/types/database";
import type { z } from "zod";

const PanoramaCanvas = dynamic(() => import("@/components/panorama-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-[16px] bg-[#17211F] text-sm text-white">
      Loading 360 editor...
    </div>
  ),
});

type DetailsFormValues = z.infer<typeof listingDetailsSchema>;
type EnvFormValues = z.infer<typeof listingEnvironmentSchema>;

interface WizardProps {
  userId: string;
  initialListing?: Listing | null;
  initialEnvironment?: ListingEnvironment | null;
  initialRooms?: Room[];
  initialRoomLinks?: RoomLink[];
}

const STEPS = [
  { num: 1, label: "Details" },
  { num: 2, label: "Neighborhood" },
  { num: 3, label: "Rooms" },
  { num: 4, label: "Preview" },
] as const;

function SegmentedFactor<T extends string>({
  label,
  helper,
  value,
  options,
  onChange,
}: {
  label: string;
  helper: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (val: T) => void;
}) {
  return (
    <div className="space-y-2 rounded-[18px] border-[1.5px] border-[#E2DFD6] bg-white p-4">
      <div>
        <p className="font-heading text-sm font-bold text-[#17211F]">{label}</p>
        <p className="text-xs text-[#5B6663]">{helper}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "min-h-[44px] flex-1 rounded-[14px] border-[1.5px] px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                active
                  ? "border-[#0E6B5B] bg-[#0E6B5B] text-white"
                  : "border-[#E2DFD6] bg-[#F6F4EF] text-[#17211F] hover:bg-[#DDEEE9]"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LandlordWizardClient({
  userId,
  initialListing,
  initialEnvironment,
  initialRooms = [],
  initialRoomLinks = [],
}: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [listingId, setListingId] = useState<string | null>(
    initialListing?.id ?? null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Step 1 form
  const detailsForm = useForm<DetailsFormValues>({
    resolver: zodResolver(listingDetailsSchema),
    defaultValues: {
      title: initialListing?.title ?? "",
      description: initialListing?.description ?? "",
      property_type: initialListing?.property_type ?? "flat",
      rent_amount: initialListing?.rent_amount ?? 1500000,
      rent_period: initialListing?.rent_period ?? "year",
      agency_fee: initialListing?.agency_fee ?? null,
      legal_fee: initialListing?.legal_fee ?? null,
      caution_fee: initialListing?.caution_fee ?? null,
      bedrooms: initialListing?.bedrooms ?? 2,
      bathrooms: initialListing?.bathrooms ?? 2,
      size_sqm: initialListing?.size_sqm ?? null,
      furnished: initialListing?.furnished ?? false,
      amenities: initialListing?.amenities ?? ["prepaid_meter", "borehole"],
      state: initialListing?.state ?? "Lagos",
      lga: initialListing?.lga ?? "Ikeja",
      area: initialListing?.area ?? "",
      address_line: initialListing?.address_line ?? "",
      matterport_url: initialListing?.matterport_url ?? "",
    },
  });

  const watchedState = detailsForm.watch("state");
  const watchedAmenities = detailsForm.watch("amenities");
  const watchedFurnished = detailsForm.watch("furnished");
  const allStates = useMemo(() => getAllStates(), []);
  const lgasForSelectedState = useMemo(
    () => getLgasForState(watchedState),
    [watchedState]
  );

  // Step 2 environment state
  const [envState, setEnvState] = useState<EnvFormValues>({
    power_grid: initialEnvironment?.power_grid ?? "fair",
    grid_hours_per_day: initialEnvironment?.grid_hours_per_day ?? 10,
    power_backup:
      (initialEnvironment?.power_backup as EnvFormValues["power_backup"]) ?? [
        "generator",
      ],
    road_surface: initialEnvironment?.road_surface ?? "tarred",
    road_condition: initialEnvironment?.road_condition ?? "good",
    flooding: initialEnvironment?.flooding ?? "none",
    waste: initialEnvironment?.waste ?? "regular",
    water: initialEnvironment?.water ?? "borehole",
    security: initialEnvironment?.security ?? "good",
    network: initialEnvironment?.network ?? "good",
    note: initialEnvironment?.note ?? "",
  });

  // Step 3 rooms & links state
  const [rooms, setRooms] = useState<
    Array<RoomInputPayload & { previewUrl: string }>
  >(
    initialRooms.map((r, idx) => ({
      id: r.id,
      name: r.name,
      kind: r.kind,
      photo_path: r.photo_path,
      previewUrl: resolveListingPhotoUrl(r.photo_path),
      width: r.width,
      height: r.height,
      sort_order: idx,
    }))
  );
  const [coverThumbPath, setCoverThumbPath] = useState<string | null>(
    initialListing?.cover_thumb_path ?? null
  );
  const [roomLinks, setRoomLinks] = useState<RoomLinkInputPayload[]>(
    initialRoomLinks.map((l) => ({
      id: l.id,
      from_room_id: l.from_room_id,
      to_room_id: l.to_room_id,
      yaw: l.yaw,
      pitch: l.pitch,
      x_pct: l.x_pct,
      y_pct: l.y_pct,
      label: l.label,
    }))
  );

  const [uploadingRoom, setUploadingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState<string>(ROOM_NAME_PRESETS[0]);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Hotspot editor state
  const [linkingRoomId, setLinkingRoomId] = useState<string | null>(null);
  const [linkTargetRoomId, setLinkTargetRoomId] = useState<string>("");
  const [linkLabel, setLinkLabel] = useState("Go to next room");

  // Preview interactive tour toggle
  const [showFullTourPreview, setShowFullTourPreview] = useState(false);

  const handleSaveDetails = detailsForm.handleSubmit((values) => {
    setErrorMsg(null);
    setStatusNote(null);
    startTransition(async () => {
      const res = await saveListingDetailsAction(listingId, values);
      if (!res.ok || !res.data) {
        setErrorMsg(res.error ?? "Could not save draft details.");
        return;
      }
      setListingId(res.data.listingId);
      setStatusNote("Draft saved.");
      setStep(2);
    });
  });

  const handleSaveEnvironment = () => {
    if (!listingId) {
      setErrorMsg("Save Step 1 Details first.");
      return;
    }
    const parsed = listingEnvironmentSchema.safeParse(envState);
    if (!parsed.success) {
      setErrorMsg(parsed.error.issues[0]?.message ?? "Check neighborhood answers.");
      return;
    }
    setErrorMsg(null);
    setStatusNote(null);
    startTransition(async () => {
      const res = await saveListingEnvironmentAction(listingId, parsed.data);
      if (!res.ok) {
        setErrorMsg(res.error ?? "Could not save neighborhood report.");
        return;
      }
      setStatusNote("Neighborhood report saved to draft.");
      setStep(3);
    });
  };

  const handleRoomFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !listingId) return;
    if (rooms.length >= MAX_ROOMS_PER_LISTING) {
      setErrorMsg(`Maximum ${MAX_ROOMS_PER_LISTING} rooms per listing.`);
      return;
    }

    setErrorMsg(null);
    setUploadingRoom(true);
    try {
      const prepared = await compressRoomImageOnDevice(file);
      const roomId = crypto.randomUUID();
      let storedPath = "";
      let previewUrl = "";
      let thumbPathToStore: string | null = null;

      if (isSupabaseConfigured()) {
        const supabase = createSupabaseBrowserClient();
        if (!supabase) throw new Error("Supabase browser client unavailable.");

        const mainPath = `${userId}/${listingId}/${roomId}.webp`;
        const { error: upErr } = await supabase.storage
          .from("listing-photos")
          .upload(mainPath, prepared.mainFile, {
            contentType: "image/webp",
            upsert: true,
          });
        if (upErr) throw new Error(upErr.message);

        storedPath = mainPath;
        previewUrl = resolveListingPhotoUrl(mainPath);

        if (rooms.length === 0) {
          const thumbPath = `${userId}/${listingId}/cover-thumb.webp`;
          const { error: thumbErr } = await supabase.storage
            .from("listing-photos")
            .upload(thumbPath, prepared.thumbFile, {
              contentType: "image/webp",
              upsert: true,
            });
          if (!thumbErr) thumbPathToStore = thumbPath;
        }
      } else {
        const mainDataUrl = await fileToDataUrl(prepared.mainFile);
        storedPath = mainDataUrl;
        previewUrl = mainDataUrl;
        if (rooms.length === 0) {
          thumbPathToStore = await fileToDataUrl(prepared.thumbFile);
        }
      }

      if (thumbPathToStore) {
        setCoverThumbPath(thumbPathToStore);
      }

      const nextRoom: RoomInputPayload & { previewUrl: string } = {
        id: roomId,
        name: newRoomName.trim() || `Room ${rooms.length + 1}`,
        kind: prepared.detectedKind,
        photo_path: storedPath,
        previewUrl,
        width: prepared.width,
        height: prepared.height,
        sort_order: rooms.length,
      };
      setRooms((prev) => [...prev, nextRoom]);

      if (nextRoom.kind === "flat") {
        void fetch(`/api/listings/${listingId}/depth-map`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoPath: storedPath }),
        }).catch(() => undefined);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to process photo.");
    } finally {
      setUploadingRoom(false);
    }
  };

  const moveRoom = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= rooms.length || fromIdx === toIdx) return;
    setRooms((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, moved);
      return copy.map((r, i) => ({ ...r, sort_order: i }));
    });
  };

  const removeRoom = (roomId: string) => {
    setRooms((prev) =>
      prev.filter((r) => r.id !== roomId).map((r, i) => ({ ...r, sort_order: i }))
    );
    setRoomLinks((prev) =>
      prev.filter((l) => l.from_room_id !== roomId && l.to_room_id !== roomId)
    );
    if (linkingRoomId === roomId) setLinkingRoomId(null);
  };

  const addFlatHotspot = (
    roomId: string,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    if (!linkTargetRoomId || linkTargetRoomId === roomId) {
      setErrorMsg("Pick a destination room first.");
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(1));
    const yPct = Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(1));

    const targetRoom = rooms.find((r) => r.id === linkTargetRoomId);
    const label = linkLabel.trim() || `Go to ${targetRoom?.name ?? "room"}`;

    setRoomLinks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        from_room_id: roomId,
        to_room_id: linkTargetRoomId,
        yaw: null,
        pitch: null,
        x_pct: xPct,
        y_pct: yPct,
        label,
      },
    ]);
    setErrorMsg(null);
  };

  const addPanoramaHotspot = (
    roomId: string,
    coords: { yaw: number; pitch: number }
  ) => {
    if (!linkTargetRoomId || linkTargetRoomId === roomId) {
      setErrorMsg("Pick a destination room first.");
      return;
    }
    const targetRoom = rooms.find((r) => r.id === linkTargetRoomId);
    const label = linkLabel.trim() || `Go to ${targetRoom?.name ?? "room"}`;

    setRoomLinks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        from_room_id: roomId,
        to_room_id: linkTargetRoomId,
        yaw: coords.yaw,
        pitch: coords.pitch,
        x_pct: null,
        y_pct: null,
        label,
      },
    ]);
    setErrorMsg(null);
  };

  const handleSaveRooms = () => {
    if (!listingId) {
      setErrorMsg("Save Details first.");
      return;
    }
    if (rooms.length === 0) {
      setErrorMsg("Add at least 1 room photo to build your tour.");
      return;
    }
    setErrorMsg(null);
    setStatusNote(null);
    startTransition(async () => {
      const payload: RoomInputPayload[] = rooms.map((r, idx) => ({
        id: r.id,
        name: r.name,
        kind: r.kind,
        photo_path: r.photo_path,
        width: r.width,
        height: r.height,
        sort_order: idx,
      }));
      const res = await saveListingRoomsAction(
        listingId,
        payload,
        roomLinks,
        coverThumbPath
      );
      if (!res.ok) {
        setErrorMsg(res.error ?? "Could not save rooms.");
        return;
      }
      setStatusNote("Rooms and tour links saved to draft.");
      setStep(4);
    });
  };

  const handlePublish = () => {
    if (!listingId) return;
    setErrorMsg(null);
    startTransition(async () => {
      const res = await publishListingAction(listingId);
      if (!res.ok) {
        setErrorMsg(res.error ?? "Could not publish listing.");
        return;
      }
      router.push(`/listing/${listingId}`);
      router.refresh();
    });
  };

  const detailsSnapshot = detailsForm.getValues();
  const moveInTotal = calculateMoveInTotal({
    rentAmount: Number(detailsSnapshot.rent_amount || 0),
    agencyFee: detailsSnapshot.agency_fee ?? 0,
    legalFee: detailsSnapshot.legal_fee ?? 0,
    cautionFee: detailsSnapshot.caution_fee ?? 0,
  });

  if (showFullTourPreview) {
    return (
      <div className="fixed inset-0 z-50">
        <div className="relative h-full w-full">
          <TourViewer
            listingId={listingId ?? "preview"}
            listingTitle={detailsSnapshot.title || "Draft listing"}
            rooms={rooms.map((r, i) => ({
              id: r.id,
              listing_id: listingId ?? "preview",
              name: r.name,
              kind: r.kind,
              photo_path: r.previewUrl,
              width: r.width,
              height: r.height,
              sort_order: i,
            }))}
            roomLinks={roomLinks}
            exitHref="#close-preview"
          />
          <button
            type="button"
            onClick={() => setShowFullTourPreview(false)}
            className="fixed right-4 top-4 z-50 inline-flex min-h-[44px] items-center rounded-full bg-[#0E6B5B] px-4 text-sm font-semibold text-white shadow-lg"
          >
            Back to editor
          </button>
        </div>
      </div>
    );
  }

  const linkingRoom = rooms.find((r) => r.id === linkingRoomId) ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#17211F]">
          {initialListing ? "Edit listing" : "List a place"}
        </h1>
        <p className="mt-1 text-sm text-[#5B6663]">
          Your progress saves as a draft after every step.
        </p>
      </div>

      {/* 4-Step Indicator */}
      <nav aria-label="Listing creation steps" className="grid grid-cols-4 gap-2">
        {STEPS.map((s) => {
          const active = step === s.num;
          const canJump = s.num === 1 || Boolean(listingId);
          return (
            <button
              key={s.num}
              type="button"
              disabled={!canJump}
              onClick={() => canJump && setStep(s.num)}
              className={cn(
                "flex min-h-[44px] flex-col items-center justify-center rounded-[14px] border-[1.5px] px-2 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-45",
                active
                  ? "border-[#0E6B5B] bg-[#0E6B5B] text-white"
                  : "border-[#E2DFD6] bg-white text-[#17211F]"
              )}
            >
              <span>
                {s.num}. {s.label}
              </span>
            </button>
          );
        })}
      </nav>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-[16px] border-[1.5px] border-[#B3261E]/40 bg-[#FBE9E7] p-3.5 text-sm font-medium text-[#B3261E]"
        >
          {errorMsg}
        </div>
      )}
      {statusNote && (
        <div
          role="status"
          className="rounded-[16px] border-[1.5px] border-[#0E6B5B]/30 bg-[#DDEEE9] p-3 text-xs font-semibold text-[#0E6B5B]"
        >
          {statusNote}
        </div>
      )}

      {/* STEP 1: DETAILS */}
      {step === 1 && (
        <form onSubmit={handleSaveDetails} className="space-y-4">
          <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="det-title">Listing title</Label>
              <Input
                id="det-title"
                placeholder="e.g. Bright 2-Bedroom Flat in Ikeja GRA"
                {...detailsForm.register("title")}
              />
              {detailsForm.formState.errors.title && (
                <p className="text-xs text-[#B3261E]">
                  {detailsForm.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="det-desc">
                Description (up to {DESCRIPTION_MAX_CHARS} characters)
              </Label>
              <Textarea
                id="det-desc"
                maxLength={DESCRIPTION_MAX_CHARS}
                placeholder="Describe room sizes, ventilation, kitchen setup, and compound rules."
                {...detailsForm.register("description")}
              />
              {detailsForm.formState.errors.description && (
                <p className="text-xs text-[#B3261E]">
                  {detailsForm.formState.errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="det-type">Property type</Label>
                <select
                  id="det-type"
                  {...detailsForm.register("property_type")}
                  className="min-h-[44px] w-full rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-white px-3 text-sm"
                >
                  {PROPERTY_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det-period">Rent period</Label>
                <select
                  id="det-period"
                  {...detailsForm.register("rent_period")}
                  className="min-h-[44px] w-full rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-white px-3 text-sm"
                >
                  <option value="year">Per year (default)</option>
                  <option value="month">Per month</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="det-rent">Rent in Naira (₦)</Label>
                <Input
                  id="det-rent"
                  type="number"
                  min={10000}
                  step={10000}
                  {...detailsForm.register("rent_amount")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="det-caution">Caution deposit (optional ₦)</Label>
                <Input
                  id="det-caution"
                  type="number"
                  min={0}
                  step={10000}
                  placeholder="0"
                  {...detailsForm.register("caution_fee", {
                    setValueAs: (v) =>
                      v === "" || v === null || v === undefined || Number.isNaN(Number(v))
                        ? null
                        : Number(v),
                  })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="det-agency">Agency fee (optional ₦)</Label>
                <Input
                  id="det-agency"
                  type="number"
                  min={0}
                  step={10000}
                  placeholder="0"
                  {...detailsForm.register("agency_fee", {
                    setValueAs: (v) =>
                      v === "" || v === null || v === undefined || Number.isNaN(Number(v))
                        ? null
                        : Number(v),
                  })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="det-legal">Legal fee (optional ₦)</Label>
                <Input
                  id="det-legal"
                  type="number"
                  min={0}
                  step={10000}
                  placeholder="0"
                  {...detailsForm.register("legal_fee", {
                    setValueAs: (v) =>
                      v === "" || v === null || v === undefined || Number.isNaN(Number(v))
                        ? null
                        : Number(v),
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="det-beds">Bedrooms</Label>
                <Input
                  id="det-beds"
                  type="number"
                  min={0}
                  max={20}
                  {...detailsForm.register("bedrooms")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="det-baths">Bathrooms</Label>
                <Input
                  id="det-baths"
                  type="number"
                  min={0}
                  max={20}
                  {...detailsForm.register("bathrooms")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="det-size">Size in sqm (optional)</Label>
                <Input
                  id="det-size"
                  type="number"
                  min={5}
                  max={50000}
                  placeholder="e.g. 110"
                  {...detailsForm.register("size_sqm", {
                    setValueAs: (v) =>
                      v === "" || v === null || v === undefined || Number.isNaN(Number(v))
                        ? null
                        : Number(v),
                  })}
                />
                {detailsForm.formState.errors.size_sqm && (
                  <p className="text-xs text-[#B3261E]">
                    {detailsForm.formState.errors.size_sqm.message}
                  </p>
                )}
              </div>
            </div>

            <label
              htmlFor="det-furnished"
              className="flex min-h-[44px] cursor-pointer items-center gap-3"
            >
              <Checkbox
                id="det-furnished"
                checked={watchedFurnished}
                onCheckedChange={(v) => detailsForm.setValue("furnished", Boolean(v))}
              />
              <span className="text-sm font-medium text-[#17211F]">
                This home comes furnished
              </span>
            </label>

            <div className="space-y-2 border-t-[1.5px] border-[#E2DFD6] pt-3">
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 gap-2">
                {AMENITIES.map((am) => {
                  const checked = watchedAmenities.includes(am.value);
                  return (
                    <label
                      key={am.value}
                      htmlFor={`am-${am.value}`}
                      className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm"
                    >
                      <Checkbox
                        id={`am-${am.value}`}
                        checked={checked}
                        onCheckedChange={(isChecked) => {
                          const next = isChecked
                            ? [...watchedAmenities, am.value]
                            : watchedAmenities.filter((v) => v !== am.value);
                          detailsForm.setValue("amenities", next);
                        }}
                      />
                      <span>{am.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 border-t-[1.5px] border-[#E2DFD6] pt-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="det-state">State</Label>
                <select
                  id="det-state"
                  value={watchedState}
                  onChange={(e) => {
                    const nextState = e.target.value;
                    detailsForm.setValue("state", nextState);
                    const nextLgas = getLgasForState(nextState);
                    detailsForm.setValue("lga", nextLgas[0] ?? "");
                  }}
                  className="min-h-[44px] w-full rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-white px-3 text-sm"
                >
                  {allStates.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="det-lga">LGA</Label>
                <select
                  id="det-lga"
                  {...detailsForm.register("lga")}
                  className="min-h-[44px] w-full rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-white px-3 text-sm"
                >
                  {lgasForSelectedState.map((lga) => (
                    <option key={lga} value={lga}>
                      {lga}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="det-area">Area / Neighbourhood</Label>
              <Input
                id="det-area"
                placeholder="e.g. Ikeja GRA, Wuse II, Choba"
                {...detailsForm.register("area")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="det-address">
                Street address (hidden until you accept a viewing request)
              </Label>
              <Input
                id="det-address"
                placeholder="House number and street name"
                {...detailsForm.register("address_line")}
              />
              {detailsForm.formState.errors.address_line && (
                <p className="text-xs text-[#B3261E]">
                  {detailsForm.formState.errors.address_line.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="det-matterport">
                Matterport 3D tour link (optional)
              </Label>
              <Input
                id="det-matterport"
                type="url"
                placeholder="https://my.matterport.com/show/?m=..."
                {...detailsForm.register("matterport_url")}
              />
              {detailsForm.formState.errors.matterport_url && (
                <p className="text-xs text-[#B3261E]">
                  {detailsForm.formState.errors.matterport_url.message}
                </p>
              )}
            </div>
          </div>

          <Button type="submit" size="lg" disabled={isPending} className="w-full">
            {isPending ? "Saving draft..." : "Save & continue to Neighborhood"}
          </Button>
        </form>
      )}

      {/* STEP 2: NEIGHBORHOOD & ENVIRONMENT */}
      {step === 2 && (
        <div className="space-y-4">
          <SegmentedFactor
            label="Electricity from the grid"
            helper="Be honest about daily NEPA/DisCo supply so renters plan backup."
            value={envState.power_grid}
            options={[
              { value: "steady", label: "Steady" },
              { value: "fair", label: "Fair" },
              { value: "poor", label: "Poor" },
              { value: "none", label: "None" },
            ]}
            onChange={(v) => setEnvState((s) => ({ ...s, power_grid: v }))}
          />

          <div className="rounded-[18px] border-[1.5px] border-[#E2DFD6] bg-white p-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="env-hours">
                Average hours of grid power per day (optional, 0 to 24)
              </Label>
              <Input
                id="env-hours"
                type="number"
                min={0}
                max={24}
                value={envState.grid_hours_per_day ?? ""}
                onChange={(e) =>
                  setEnvState((s) => ({
                    ...s,
                    grid_hours_per_day:
                      e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Backup power available</Label>
              <div className="flex flex-wrap gap-2">
                {BACKUP_POWER_OPTIONS.map((opt) => {
                  const selected = envState.power_backup.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setEnvState((s) => {
                          if (opt.value === "none") {
                            return { ...s, power_backup: ["none"] };
                          }
                          const withoutNone = s.power_backup.filter(
                            (x) => x !== "none"
                          );
                          const next = withoutNone.includes(opt.value)
                            ? withoutNone.filter((x) => x !== opt.value)
                            : [...withoutNone, opt.value];
                          return { ...s, power_backup: next };
                        });
                      }}
                      className={cn(
                        "min-h-[44px] rounded-full border-[1.5px] px-4 text-sm font-medium cursor-pointer",
                        selected
                          ? "border-[#0E6B5B] bg-[#DDEEE9] text-[#0E6B5B]"
                          : "border-[#E2DFD6] bg-white text-[#17211F]"
                      )}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <SegmentedFactor
            label="Road surface to the property"
            helper="Is the street leading directly to the gate paved with asphalt?"
            value={envState.road_surface}
            options={[
              { value: "tarred", label: "Tarred" },
              { value: "partly_tarred", label: "Partly tarred" },
              { value: "untarred", label: "Untarred" },
            ]}
            onChange={(v) => setEnvState((s) => ({ ...s, road_surface: v }))}
          />

          <SegmentedFactor
            label="Road condition"
            helper="Bad means deep potholes, erosion, or hard to drive in rainy season."
            value={envState.road_condition}
            options={[
              { value: "good", label: "Good" },
              { value: "fair", label: "Fair" },
              { value: "bad", label: "Bad" },
            ]}
            onChange={(v) => setEnvState((s) => ({ ...s, road_condition: v }))}
          />

          <SegmentedFactor
            label="Rainy-season flooding"
            helper="Does water enter the street or compound during heavy rains?"
            value={envState.flooding}
            options={[
              { value: "none", label: "None" },
              { value: "sometimes", label: "Sometimes" },
              { value: "often", label: "Often" },
            ]}
            onChange={(v) => setEnvState((s) => ({ ...s, flooding: v }))}
          />

          <SegmentedFactor
            label="Waste management"
            helper="Whether municipal waste trucks collect refuse regularly or not."
            value={envState.waste}
            options={[
              { value: "regular", label: "Regular collection" },
              { value: "irregular", label: "Irregular" },
              { value: "none", label: "None" },
            ]}
            onChange={(v) => setEnvState((s) => ({ ...s, waste: v }))}
          />

          <SegmentedFactor
            label="Water supply"
            helper="Main daily source of water inside the compound."
            value={envState.water}
            options={[
              { value: "running_water", label: "Running water" },
              { value: "borehole", label: "Borehole" },
              { value: "vendor_well", label: "Vendor or well" },
              { value: "none", label: "None" },
            ]}
            onChange={(v) => setEnvState((s) => ({ ...s, water: v }))}
          />

          <SegmentedFactor
            label="Security"
            helper="Gate, compound security post, and street lighting at night."
            value={envState.security}
            options={[
              { value: "good", label: "Good" },
              { value: "fair", label: "Fair" },
              { value: "poor", label: "Poor" },
            ]}
            onChange={(v) => setEnvState((s) => ({ ...s, security: v }))}
          />

          <SegmentedFactor
            label="Mobile network"
            helper="Indoor 4G voice and data signal for major Nigerian networks."
            value={envState.network}
            options={[
              { value: "good", label: "Good" },
              { value: "fair", label: "Fair" },
              { value: "poor", label: "Poor" },
            ]}
            onChange={(v) => setEnvState((s) => ({ ...s, network: v }))}
          />

          <div className="rounded-[18px] border-[1.5px] border-[#E2DFD6] bg-white p-4 space-y-1.5">
            <Label htmlFor="env-note">
              Additional neighborhood note (up to {ENVIRONMENT_NOTE_MAX_CHARS} characters)
            </Label>
            <Textarea
              id="env-note"
              maxLength={ENVIRONMENT_NOTE_MAX_CHARS}
              value={envState.note ?? ""}
              onChange={(e) => setEnvState((s) => ({ ...s, note: e.target.value }))}
              placeholder="e.g. LAWMA comes every Wednesday; solar streetlights work until dawn."
            />
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={isPending}
              onClick={handleSaveEnvironment}
              className="flex-1"
            >
              {isPending ? "Saving..." : "Save & continue to Rooms"}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: ROOMS & TOUR HOTSPOTS */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-5 space-y-4">
            <div>
              <h2 className="font-heading text-base font-bold text-[#17211F]">
                Add room photos ({rooms.length} of {MAX_ROOMS_PER_LISTING})
              </h2>
              <p className="text-xs text-[#5B6663]">
                Photos are compressed on your phone before upload. 2:1 panoramas are
                detected automatically as 360 views.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {ROOM_NAME_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setNewRoomName(preset)}
                  className={cn(
                    "min-h-[40px] rounded-full border-[1.5px] px-3.5 text-xs font-medium cursor-pointer",
                    newRoomName === preset
                      ? "border-[#0E6B5B] bg-[#DDEEE9] text-[#0E6B5B]"
                      : "border-[#E2DFD6] bg-white text-[#17211F]"
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="room-name-input">Room name</Label>
                <Input
                  id="room-name-input"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Custom room name"
                />
              </div>

              <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-[#0E6B5B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0a574a]">
                <Upload className="h-4 w-4" strokeWidth={2} />
                <span>{uploadingRoom ? "Compressing..." : "Upload photo"}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={uploadingRoom || rooms.length >= MAX_ROOMS_PER_LISTING}
                  onChange={handleRoomFileSelected}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* Room List (draggable + accessible buttons) */}
          {rooms.length > 0 && (
            <div className="space-y-3">
              {rooms.map((room, idx) => {
                const linksFromThisRoom = roomLinks.filter(
                  (l) => l.from_room_id === room.id
                );
                return (
                  <div
                    key={room.id}
                    draggable
                    onDragStart={() => setDraggedIdx(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedIdx !== null) moveRoom(draggedIdx, idx);
                      setDraggedIdx(null);
                    }}
                    className="rounded-[20px] border-[1.5px] border-[#E2DFD6] bg-white p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <GripVertical
                        className="mt-2 h-5 w-5 shrink-0 text-[#5B6663]"
                        strokeWidth={2}
                      />
                      <img
                        src={room.previewUrl}
                        alt={room.name}
                        width={96}
                        height={72}
                        className="h-16 w-24 shrink-0 rounded-[12px] object-cover bg-[#DDEEE9]"
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-heading text-sm font-bold text-[#17211F] truncate">
                            {idx + 1}. {room.name}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              aria-label={`Move ${room.name} up`}
                              disabled={idx === 0}
                              onClick={() => moveRoom(idx, idx - 1)}
                              className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-full border border-[#E2DFD6] disabled:opacity-35 cursor-pointer"
                            >
                              <ArrowUp className="h-4 w-4" strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Move ${room.name} down`}
                              disabled={idx === rooms.length - 1}
                              onClick={() => moveRoom(idx, idx + 1)}
                              className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-full border border-[#E2DFD6] disabled:opacity-35 cursor-pointer"
                            >
                              <ArrowDown className="h-4 w-4" strokeWidth={2} />
                            </button>
                            <button
                              type="button"
                              aria-label={`Remove ${room.name}`}
                              onClick={() => removeRoom(room.id)}
                              className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-full text-[#B3261E] hover:bg-[#FBE9E7] cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={2} />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setRooms((prev) =>
                                prev.map((r) =>
                                  r.id === room.id
                                    ? {
                                        ...r,
                                        kind: r.kind === "panorama" ? "flat" : "panorama",
                                      }
                                    : r
                                )
                              )
                            }
                            className="inline-flex min-h-[34px] items-center gap-1 rounded-full bg-[#DDEEE9] px-3 text-xs font-semibold text-[#0E6B5B] cursor-pointer"
                          >
                            <Compass className="h-3.5 w-3.5" strokeWidth={2} />
                            <span>
                              {room.kind === "panorama"
                                ? "360 Panorama (tap to switch)"
                                : "Flat photo (tap to switch)"}
                            </span>
                          </button>

                          {rooms.length >= 2 && (
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                linkingRoomId === room.id ? "default" : "outline"
                              }
                              onClick={() => {
                                const next =
                                  linkingRoomId === room.id ? null : room.id;
                                setLinkingRoomId(next);
                                const firstOther = rooms.find((o) => o.id !== room.id);
                                if (firstOther) {
                                  setLinkTargetRoomId(firstOther.id);
                                  setLinkLabel(`Go to ${firstOther.name}`);
                                }
                              }}
                            >
                              <Link2 className="h-3.5 w-3.5" strokeWidth={2} />
                              <span>
                                Link rooms ({linksFromThisRoom.length})
                              </span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Hotspot Editor Panel */}
          {linkingRoom && (
            <div className="rounded-[22px] border-[1.5px] border-[#0E6B5B] bg-white p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="font-heading text-base font-bold text-[#17211F]">
                    Link doorways from {linkingRoom.name}
                  </h3>
                  <p className="text-xs text-[#5B6663]">
                    Choose a destination room below, then tap the doorway in the photo.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setLinkingRoomId(null)}
                >
                  Done
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="link-target">Destination room</Label>
                  <select
                    id="link-target"
                    value={linkTargetRoomId}
                    onChange={(e) => {
                      setLinkTargetRoomId(e.target.value);
                      const target = rooms.find((r) => r.id === e.target.value);
                      if (target) setLinkLabel(`Go to ${target.name}`);
                    }}
                    className="min-h-[44px] w-full rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-white px-3 text-sm"
                  >
                    {rooms
                      .filter((r) => r.id !== linkingRoom.id)
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="link-label">Hotspot label</Label>
                  <Input
                    id="link-label"
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    placeholder="e.g. Go to Kitchen"
                  />
                </div>
              </div>

              {linkingRoom.kind === "panorama" ? (
                <div className="h-72 overflow-hidden rounded-[16px] border-[1.5px] border-[#E2DFD6]">
                  <PanoramaCanvas
                    src={linkingRoom.previewUrl}
                    alt={linkingRoom.name}
                    links={roomLinks
                      .filter((l) => l.from_room_id === linkingRoom.id)
                      .map((l) => ({ ...l }))}
                    onPlaceHotspot={(coords) =>
                      addPanoramaHotspot(linkingRoom.id, coords)
                    }
                  />
                </div>
              ) : (
                <div
                  onClick={(e) => addFlatHotspot(linkingRoom.id, e)}
                  className="relative cursor-crosshair overflow-hidden rounded-[16px] border-[1.5px] border-[#E2DFD6]"
                >
                  <img
                    src={linkingRoom.previewUrl}
                    alt={`Tap to place hotspot in ${linkingRoom.name}`}
                    className="max-h-80 w-full object-contain bg-[#17211F]"
                  />
                  {roomLinks
                    .filter((l) => l.from_room_id === linkingRoom.id)
                    .map((l) => (
                      <span
                        key={l.id}
                        style={{
                          left: `${l.x_pct ?? 50}%`,
                          top: `${l.y_pct ?? 50}%`,
                        }}
                        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#E3A93B] bg-[#0E6B5B] px-2.5 py-1 text-xs font-semibold text-white"
                      >
                        {l.label}
                      </span>
                    ))}
                </div>
              )}

              {roomLinks.filter((l) => l.from_room_id === linkingRoom.id).length > 0 && (
                <ul className="space-y-1.5">
                  {roomLinks
                    .filter((l) => l.from_room_id === linkingRoom.id)
                    .map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center justify-between rounded-[12px] bg-[#F6F4EF] px-3 py-2 text-xs"
                      >
                        <span>
                          <strong>{l.label}</strong> →{" "}
                          {rooms.find((r) => r.id === l.to_room_id)?.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setRoomLinks((prev) => prev.filter((x) => x.id !== l.id))
                          }
                          className="font-semibold text-[#B3261E] cursor-pointer"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={isPending}
              onClick={handleSaveRooms}
              className="flex-1"
            >
              {isPending ? "Saving rooms..." : "Save & preview"}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: PREVIEW & PUBLISH */}
      {step === 4 && (
        <div className="space-y-5">
          <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-5 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-heading text-xl font-bold text-[#17211F]">
                {detailsSnapshot.title}
              </h2>
              <span className="font-heading text-lg font-bold text-[#0E6B5B] tabular-nums">
                {formatNaira(Number(detailsSnapshot.rent_amount || 0))}/
                {detailsSnapshot.rent_period}
              </span>
            </div>
            <p className="text-sm text-[#5B6663]">
              {detailsSnapshot.area}, {detailsSnapshot.lga}, {detailsSnapshot.state}
            </p>
            <p className="text-xs font-medium text-[#17211F] tabular-nums">
              Estimated total to move in: {formatNaira(moveInTotal)}
            </p>

            {rooms.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowFullTourPreview(true)}
                className="w-full"
              >
                <Compass className="h-4 w-4" strokeWidth={2} />
                <span>Preview room-by-room tour ({rooms.length} rooms)</span>
              </Button>
            )}
          </div>

          <NeighborhoodReport
            environment={{
              listing_id: listingId ?? "preview",
              power_grid: envState.power_grid,
              grid_hours_per_day: envState.grid_hours_per_day ?? null,
              power_backup: envState.power_backup,
              road_surface: envState.road_surface,
              road_condition: envState.road_condition,
              flooding: envState.flooding,
              waste: envState.waste,
              water: envState.water,
              security: envState.security,
              network: envState.network,
              note: envState.note ?? null,
            }}
          />

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button
              type="button"
              size="lg"
              disabled={isPending}
              onClick={handlePublish}
              className="flex-1"
            >
              <Check className="h-4 w-4" strokeWidth={2} />
              <span>{isPending ? "Publishing..." : "Publish listing"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
