"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  MoveRight,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Room, RoomLink } from "@/types/database";

const PanoramaCanvas = dynamic(() => import("@/components/panorama-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#17211F] text-sm text-white/80">
      Loading 360 room...
    </div>
  ),
});

interface TourViewerProps {
  listingId: string;
  listingTitle: string;
  rooms: Room[];
  roomLinks: RoomLink[];
  exitHref?: string;
}

export function TourViewer({
  listingId,
  listingTitle,
  rooms,
  roomLinks,
  exitHref,
}: TourViewerProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedMap, setLoadedMap] = useState<Record<string, boolean>>({});
  const [isFading, setIsFading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panCommand, setPanCommand] = useState<{
    dx: number;
    dy: number;
    seq: number;
  } | null>(null);

  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null
  );
  const prefetchedRef = useRef<Set<string>>(new Set());

  const currentRoom = rooms[currentIndex] ?? null;

  const currentLinks = useMemo(() => {
    if (!currentRoom) return [];
    return roomLinks.filter((link) => link.from_room_id === currentRoom.id);
  }, [currentRoom, roomLinks]);

  const navigateToRoom = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= rooms.length) return;
      if (targetIndex === currentIndex) return;

      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      setZoom(1);
      setPan({ x: 0, y: 0 });

      if (prefersReducedMotion) {
        setCurrentIndex(targetIndex);
        return;
      }

      setIsFading(true);
      window.setTimeout(() => {
        setCurrentIndex(targetIndex);
        setIsFading(false);
      }, 140);
    },
    [currentIndex, rooms.length]
  );

  const navigateToRoomId = useCallback(
    (roomId: string) => {
      const idx = rooms.findIndex((r) => r.id === roomId);
      if (idx !== -1) navigateToRoom(idx);
    },
    [navigateToRoom, rooms]
  );

  // Low-data prefetch: ONLY prefetch linked rooms AFTER the current room finishes loading
  useEffect(() => {
    if (!currentRoom || !loadedMap[currentRoom.id]) return;

    for (const link of currentLinks) {
      const target = rooms.find((r) => r.id === link.to_room_id);
      if (target && !prefetchedRef.current.has(target.photo_path)) {
        prefetchedRef.current.add(target.photo_path);
        const img = new window.Image();
        img.src = target.photo_path;
      }
    }
  }, [currentRoom, currentLinks, loadedMap, rooms]);

  // Keyboard support: Escape to exit, arrow keys to look or move
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push(exitHref ?? `/listing/${listingId}`);
        return;
      }

      if (!currentRoom) return;

      if (currentRoom.kind === "panorama") {
        const step = 0.25;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setPanCommand((prev) => ({ dx: -step, dy: 0, seq: (prev?.seq ?? 0) + 1 }));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setPanCommand((prev) => ({ dx: step, dy: 0, seq: (prev?.seq ?? 0) + 1 }));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setPanCommand((prev) => ({ dx: 0, dy: step * 0.6, seq: (prev?.seq ?? 0) + 1 }));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setPanCommand((prev) => ({
            dx: 0,
            dy: -step * 0.6,
            seq: (prev?.seq ?? 0) + 1,
          }));
        }
      } else {
        if (zoom > 1) {
          const panStep = 40;
          if (e.key === "ArrowLeft") setPan((p) => ({ ...p, x: p.x + panStep }));
          if (e.key === "ArrowRight") setPan((p) => ({ ...p, x: p.x - panStep }));
          if (e.key === "ArrowUp") setPan((p) => ({ ...p, y: p.y + panStep }));
          if (e.key === "ArrowDown") setPan((p) => ({ ...p, y: p.y - panStep }));
        } else {
          if (e.key === "ArrowLeft") {
            navigateToRoom((currentIndex - 1 + rooms.length) % rooms.length);
          } else if (e.key === "ArrowRight") {
            navigateToRoom((currentIndex + 1) % rooms.length);
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    currentIndex,
    currentRoom,
    exitHref,
    listingId,
    navigateToRoom,
    rooms.length,
    router,
    zoom,
  ]);

  if (!currentRoom) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#17211F] p-6 text-center text-white">
        <p className="font-heading text-lg font-semibold">No tour rooms yet</p>
        <Link
          href={exitHref ?? `/listing/${listingId}`}
          className="mt-4 inline-flex min-h-[44px] items-center rounded-[14px] bg-[#0E6B5B] px-5 text-sm font-semibold text-white"
        >
          Back to listing
        </Link>
      </div>
    );
  }

  const altText = `${currentRoom.name}, ${listingTitle}`;
  const isLoaded = Boolean(loadedMap[currentRoom.id]);
  const showFallbackArrows = currentLinks.length === 0 && rooms.length > 1;

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#17211F] text-white">
      {/* Top Overlay Header */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 p-4">
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-[#17211F]/80 px-4 py-2 backdrop-blur-md">
          <Compass className="h-4 w-4 text-[#E3A93B]" strokeWidth={2} />
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-semibold text-white">
              {currentRoom.name}
            </p>
            <p className="text-[11px] text-white/75 tabular-nums">
              {currentIndex + 1} of {rooms.length}
              {currentRoom.kind === "panorama" ? " · 360° view" : ""}
            </p>
          </div>
        </div>

        <Link
          href={exitHref ?? `/listing/${listingId}`}
          aria-label="Exit tour and return to listing details"
          className="pointer-events-auto inline-flex h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full bg-[#17211F]/80 px-4 text-sm font-semibold text-white backdrop-blur-md hover:bg-[#0E6B5B] focus-visible:outline-2 focus-visible:outline-[#E3A93B]"
        >
          <X className="h-4 w-4" strokeWidth={2} />
          <span>Exit</span>
        </Link>
      </header>

      {/* Main Viewport */}
      <div
        className={cn(
          "relative flex-1 overflow-hidden transition-opacity duration-150",
          isFading ? "opacity-0" : "opacity-100"
        )}
      >
        {!isLoaded && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#17211F]">
            <div className="h-full w-full animate-pulse bg-gradient-to-br from-[#17211F] via-[#233532] to-[#17211F] blur-xl" />
            <span className="absolute rounded-full bg-black/50 px-4 py-2 text-xs font-medium text-white">
              Loading {currentRoom.name}...
            </span>
          </div>
        )}

        {currentRoom.kind === "panorama" ? (
          <PanoramaCanvas
            src={currentRoom.photo_path}
            alt={altText}
            links={currentLinks}
            onSelectLink={navigateToRoomId}
            onReady={() =>
              setLoadedMap((prev) => ({ ...prev, [currentRoom.id]: true }))
            }
            panCommand={panCommand}
          />
        ) : (
          <div
            className="relative flex h-full w-full touch-none items-center justify-center overflow-hidden bg-[#17211F]"
            onPointerDown={(e) => {
              if (zoom <= 1) return;
              dragStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                panX: pan.x,
                panY: pan.y,
              };
            }}
            onPointerMove={(e) => {
              if (!dragStartRef.current) return;
              setPan({
                x: dragStartRef.current.panX + (e.clientX - dragStartRef.current.x),
                y: dragStartRef.current.panY + (e.clientY - dragStartRef.current.y),
              });
            }}
            onPointerUp={() => {
              dragStartRef.current = null;
            }}
            onPointerCancel={() => {
              dragStartRef.current = null;
            }}
          >
            <div
              className="relative max-h-full max-w-full"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transition: dragStartRef.current ? "none" : "transform 150ms ease-out",
              }}
            >
              <img
                src={currentRoom.photo_path}
                alt={altText}
                width={currentRoom.width}
                height={currentRoom.height}
                referrerPolicy="no-referrer"
                onLoad={() =>
                  setLoadedMap((prev) => ({ ...prev, [currentRoom.id]: true }))
                }
                className="max-h-[calc(100vh-140px)] w-auto max-w-full select-none object-contain"
              />

              {/* Flat-photo Hotspots */}
              {currentLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => navigateToRoomId(link.to_room_id)}
                  style={{
                    left: `${link.x_pct ?? 50}%`,
                    top: `${link.y_pct ?? 50}%`,
                  }}
                  className="absolute z-20 inline-flex min-h-[44px] min-w-[44px] -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border-2 border-[#E3A93B] bg-[#0E6B5B] px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
                >
                  <MoveRight className="h-4 w-4 shrink-0" strokeWidth={2} />
                  <span className="whitespace-nowrap">{link.label}</span>
                </button>
              ))}
            </div>

            {/* Flat Photo Zoom Controls */}
            <div className="absolute bottom-24 right-4 z-20 flex flex-col gap-2">
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((z) => Math.min(2.6, Number((z + 0.4).toFixed(1))))}
                className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#17211F]/80 text-white backdrop-blur-md hover:bg-[#0E6B5B] cursor-pointer"
              >
                <ZoomIn className="h-4 w-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => {
                  const next = Math.max(1, Number((zoom - 0.4).toFixed(1)));
                  setZoom(next);
                  if (next === 1) setPan({ x: 0, y: 0 });
                }}
                className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#17211F]/80 text-white backdrop-blur-md hover:bg-[#0E6B5B] cursor-pointer"
              >
                <ZoomOut className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

        {/* Fallback Prev/Next Arrows when room has no hotspots */}
        {showFallbackArrows && (
          <>
            <button
              type="button"
              aria-label="Previous room"
              onClick={() =>
                navigateToRoom((currentIndex - 1 + rooms.length) % rooms.length)
              }
              className="absolute left-3 top-1/2 z-20 inline-flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-[#17211F]/80 text-white backdrop-blur-md hover:bg-[#0E6B5B] cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2} />
            </button>
            <button
              type="button"
              aria-label="Next room"
              onClick={() => navigateToRoom((currentIndex + 1) % rooms.length)}
              className="absolute right-3 top-1/2 z-20 inline-flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center rounded-full bg-[#17211F]/80 text-white backdrop-blur-md hover:bg-[#0E6B5B] cursor-pointer"
            >
              <ArrowRight className="h-5 w-5" strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {/* Bottom Room Chips */}
      <footer className="z-30 border-t border-white/10 bg-[#17211F]/95 px-4 py-3 backdrop-blur-md">
        <div
          role="tablist"
          aria-label="Rooms in tour"
          className="mx-auto flex max-w-3xl items-center gap-2 overflow-x-auto"
        >
          {rooms.map((room, idx) => {
            const active = idx === currentIndex;
            return (
              <button
                key={room.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => navigateToRoom(idx)}
                className={cn(
                  "inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold transition-colors cursor-pointer",
                  active
                    ? "bg-[#0E6B5B] text-white ring-2 ring-[#E3A93B]"
                    : "bg-white/10 text-white/80 hover:bg-white/20"
                )}
              >
                <span>{room.name}</span>
              </button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
