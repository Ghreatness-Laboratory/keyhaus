"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Box, Compass, Maximize2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DepthMap, Room, RoomLink } from "@/types/database";

const PanoramaCanvas = dynamic(() => import("@/components/panorama-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#17211F] text-sm text-white/80">
      Loading 360° viewer...
    </div>
  ),
});

const DepthParallaxViewer = dynamic(() => import("./depth-parallax-viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[340px] items-center justify-center rounded-[18px] bg-[#17211F] text-sm text-white/80">
      Loading 2.5D viewer...
    </div>
  ),
});

function isSafeMatterportUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    if (
      parsed.protocol === "https:" &&
      (parsed.hostname === "my.matterport.com" || parsed.hostname === "matterport.com")
    ) {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

interface Listing3dViewProps {
  listingId: string;
  listingTitle: string;
  rooms: Room[];
  roomLinks: RoomLink[];
  depthMaps: DepthMap[];
  matterportUrl: string | null | undefined;
  activePhotoUrl: string | null;
  activePhotoLabel: string;
  canGenerateDepth: boolean;
}

export default function Listing3dView({
  listingId,
  listingTitle,
  rooms,
  roomLinks,
  depthMaps: initialDepthMaps,
  matterportUrl,
  activePhotoUrl,
  activePhotoLabel,
  canGenerateDepth,
}: Listing3dViewProps) {
  const panoramaRooms = useMemo(
    () => rooms.filter((r) => r.kind === "panorama"),
    [rooms]
  );
  const safeMatterport = useMemo(
    () => isSafeMatterportUrl(matterportUrl),
    [matterportUrl]
  );

  const [selectedPanoId, setSelectedPanoId] = useState<string>(
    panoramaRooms[0]?.id ?? ""
  );
  const [depthMaps, setDepthMaps] = useState<DepthMap[]>(initialDepthMaps);
  const [generatingDepth, setGeneratingDepth] = useState(false);
  const [depthMessage, setDepthMessage] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [preferMatterport, setPreferMatterport] = useState<boolean>(
    Boolean(safeMatterport && panoramaRooms.length === 0)
  );

  const currentPano =
    panoramaRooms.find((r) => r.id === selectedPanoId) ?? panoramaRooms[0] ?? null;

  const currentPanoLinks = useMemo(() => {
    if (!currentPano) return [];
    return roomLinks.filter((l) => l.from_room_id === currentPano.id);
  }, [currentPano, roomLinks]);

  const activeDepthMap = useMemo(() => {
    if (!activePhotoUrl) return null;
    return (
      depthMaps.find((d) => d.photo_path === activePhotoUrl) ??
      depthMaps.find((d) => d.status === "done") ??
      null
    );
  }, [activePhotoUrl, depthMaps]);

  const handleGenerateDepth = async () => {
    if (!activePhotoUrl) return;
    setDepthMessage(null);
    setGeneratingDepth(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/depth-map`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoPath: activePhotoUrl }),
      });
      const json = (await res.json()) as {
        depthMap?: DepthMap;
        fallback?: boolean;
        error?: string;
      };
      if (!res.ok || !json.depthMap) {
        setDepthMessage(json.error ?? "Depth map unavailable right now.");
        return;
      }
      setDepthMaps((prev) => {
        const filtered = prev.filter(
          (d) => d.photo_path !== json.depthMap!.photo_path
        );
        return [...filtered, json.depthMap!];
      });
      if (json.fallback || json.depthMap.status !== "done") {
        setDepthMessage(
          "Depth inference service is unconfigured or busy. Showing standard photo view."
        );
      }
    } catch {
      setDepthMessage("Could not prepare depth effect right now.");
    } finally {
      setGeneratingDepth(false);
    }
  };

  // Mode 1: Safe Matterport Embed when selected or primary
  if (safeMatterport && (preferMatterport || panoramaRooms.length === 0)) {
    return (
      <div className="space-y-3 rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-heading text-sm font-bold text-[#17211F]">
              3D Virtual Tour · Matterport
            </p>
            <p className="text-xs text-[#5B6663]">
              Interactive Matterport walkthrough for {listingTitle}.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {panoramaRooms.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreferMatterport(false)}
              >
                <Compass className="h-4 w-4" strokeWidth={2} />
                <span>360° Rooms</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" strokeWidth={2} />
              <span>Full screen</span>
            </Button>
          </div>
        </div>

        <div className="h-[340px] w-full overflow-hidden rounded-[18px] bg-[#17211F] sm:h-[420px]">
          <iframe
            src={safeMatterport}
            title={`3D tour for ${listingTitle}`}
            className="h-full w-full border-0"
            allow="xr-spatial-tracking; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        </div>

        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
          <DialogContent className="max-w-4xl p-4 sm:p-5">
            <DialogHeader>
              <DialogTitle>3D Tour · {listingTitle}</DialogTitle>
              <DialogDescription>Interactive Matterport walkthrough.</DialogDescription>
            </DialogHeader>
            <div className="mt-3 h-[70vh] w-full overflow-hidden rounded-[16px] bg-[#17211F]">
              <iframe
                src={safeMatterport}
                title={`Fullscreen 3D tour for ${listingTitle}`}
                className="h-full w-full border-0"
                allow="xr-spatial-tracking; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Mode 2: Reuse existing Photo Sphere Viewer for 360 panorama rooms
  if (currentPano) {
    return (
      <div className="space-y-3 rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-heading text-sm font-bold text-[#17211F]">
              360° 3D View · {currentPano.name}
            </p>
            <p className="text-xs text-[#5B6663]">
              Drag to look around inside this room.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {safeMatterport && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreferMatterport(true)}
              >
                <Box className="h-4 w-4" strokeWidth={2} />
                <span>Matterport</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" strokeWidth={2} />
              <span>Full screen</span>
            </Button>
          </div>
        </div>

        {panoramaRooms.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {panoramaRooms.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedPanoId(r.id)}
                className={`min-h-[38px] shrink-0 rounded-full border-[1.5px] px-3.5 text-xs font-semibold cursor-pointer ${
                  r.id === currentPano.id
                    ? "border-[#0E6B5B] bg-[#0E6B5B] text-white"
                    : "border-[#E2DFD6] bg-[#F6F4EF] text-[#17211F]"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}

        <div className="h-[340px] w-full overflow-hidden rounded-[18px] bg-[#17211F] sm:h-[420px]">
          <PanoramaCanvas
            src={currentPano.photo_path}
            alt={`${currentPano.name}, ${listingTitle}`}
            links={currentPanoLinks}
            onSelectLink={(toRoomId) => {
              if (panoramaRooms.some((r) => r.id === toRoomId)) {
                setSelectedPanoId(toRoomId);
              }
            }}
          />
        </div>

        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
          <DialogContent className="max-w-4xl p-4 sm:p-5">
            <DialogHeader>
              <DialogTitle>360° View · {currentPano.name}</DialogTitle>
              <DialogDescription>Drag or pinch to explore the room.</DialogDescription>
            </DialogHeader>
            <div className="mt-3 h-[70vh] w-full overflow-hidden rounded-[16px] bg-[#17211F]">
              <PanoramaCanvas
                src={currentPano.photo_path}
                alt={`${currentPano.name}, ${listingTitle}`}
                links={currentPanoLinks}
                onSelectLink={(toRoomId) => {
                  if (panoramaRooms.some((r) => r.id === toRoomId)) {
                    setSelectedPanoId(toRoomId);
                  }
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Mode 3: 2.5D Depth-Effect Viewer (with clean normal-photo fallback)
  return (
    <div className="space-y-3 rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-heading text-sm font-bold text-[#17211F]">
            2.5D Depth View · {activePhotoLabel}
          </p>
          <p className="text-xs text-[#5B6663]">
            {activeDepthMap?.status === "done"
              ? "Interactive parallax view generated from room depth."
              : activeDepthMap?.status === "pending"
                ? "Depth map is still processing. Showing normal photo view for now."
                : "Subtle 3D depth effect when a depth map is available."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canGenerateDepth && activePhotoUrl && activeDepthMap?.status !== "done" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={generatingDepth}
              onClick={handleGenerateDepth}
            >
              <Sparkles className="h-4 w-4" strokeWidth={2} />
              <span>
                {generatingDepth ? "Preparing 2.5D..." : "Prepare 2.5D depth"}
              </span>
            </Button>
          )}
          {activePhotoUrl && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" strokeWidth={2} />
              <span>Full screen</span>
            </Button>
          )}
        </div>
      </div>

      {depthMessage && (
        <p className="text-xs font-medium text-[#5B6663]">{depthMessage}</p>
      )}

      {activeDepthMap?.status === "done" && activeDepthMap.depth_path && activePhotoUrl ? (
        <DepthParallaxViewer
          imageUrl={activePhotoUrl}
          depthUrl={activeDepthMap.depth_path}
          alt={activePhotoLabel}
        />
      ) : activePhotoUrl ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[18px] bg-[#DDEEE9]">
          <img
            src={activePhotoUrl}
            alt={activePhotoLabel}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="flex h-[300px] items-center justify-center rounded-[18px] bg-[#F6F4EF] text-sm text-[#5B6663]">
          No room photos uploaded yet.
        </div>
      )}

      {activePhotoUrl && (
        <Dialog open={fullscreen} onOpenChange={setFullscreen}>
          <DialogContent className="max-w-4xl p-4 sm:p-5">
            <DialogHeader>
              <DialogTitle>2.5D Depth View · {activePhotoLabel}</DialogTitle>
              <DialogDescription>{listingTitle}</DialogDescription>
            </DialogHeader>
            <div className="mt-3">
              {activeDepthMap?.status === "done" && activeDepthMap.depth_path ? (
                <DepthParallaxViewer
                  imageUrl={activePhotoUrl}
                  depthUrl={activeDepthMap.depth_path}
                  alt={activePhotoLabel}
                  heightClass="h-[68vh]"
                />
              ) : (
                <img
                  src={activePhotoUrl}
                  alt={activePhotoLabel}
                  referrerPolicy="no-referrer"
                  className="max-h-[70vh] w-full rounded-[16px] object-contain bg-[#17211F]"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
