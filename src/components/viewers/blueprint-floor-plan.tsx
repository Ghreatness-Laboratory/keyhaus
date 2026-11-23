"use client";

import { useState } from "react";
import { Layers, Maximize2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BLUEPRINT_BG_HEX,
  BLUEPRINT_DISCLAIMER,
  BLUEPRINT_SVG_HEIGHT,
  BLUEPRINT_SVG_WIDTH,
  computeOpeningGeometry,
  roomToBlueprintRect,
} from "@/lib/blueprint-svg";
import type {
  FloorPlan,
  FloorPlanOpening,
  FloorPlanRoom,
  ListingFloorPlan,
} from "@/types/database";

function renderOpening(
  opening: FloorPlanOpening,
  room: FloorPlanRoom | undefined,
  idx: number
) {
  const geo = computeOpeningGeometry(opening, room);
  if (!geo) return null;

  if (geo.kind === "window") {
    if (geo.orientation === "horizontal") {
      return (
        <g key={`op-${idx}`}>
          <line x1={geo.x1} y1={geo.y} x2={geo.x2} y2={geo.y} stroke={BLUEPRINT_BG_HEX} strokeWidth={5} />
          <line x1={geo.x1} y1={geo.y - 2} x2={geo.x2} y2={geo.y - 2} stroke="#93C5FD" strokeWidth={1.5} />
          <line x1={geo.x1} y1={geo.y + 2} x2={geo.x2} y2={geo.y + 2} stroke="#93C5FD" strokeWidth={1.5} />
        </g>
      );
    }
    return (
      <g key={`op-${idx}`}>
        <line x1={geo.x} y1={geo.y1} x2={geo.x} y2={geo.y2} stroke={BLUEPRINT_BG_HEX} strokeWidth={5} />
        <line x1={geo.x - 2} y1={geo.y1} x2={geo.x - 2} y2={geo.y2} stroke="#93C5FD" strokeWidth={1.5} />
        <line x1={geo.x + 2} y1={geo.y1} x2={geo.x + 2} y2={geo.y2} stroke="#93C5FD" strokeWidth={1.5} />
      </g>
    );
  }

  return (
    <g key={`op-${idx}`}>
      <line
        x1={geo.gap.x1}
        y1={geo.gap.y1}
        x2={geo.gap.x2}
        y2={geo.gap.y2}
        stroke={BLUEPRINT_BG_HEX}
        strokeWidth={5}
      />
      <line
        x1={geo.leafLine.x1}
        y1={geo.leafLine.y1}
        x2={geo.leafLine.x2}
        y2={geo.leafLine.y2}
        stroke="#F8FAFC"
        strokeWidth={1.5}
      />
      <path
        d={geo.arcPath}
        fill="none"
        stroke="#93C5FD"
        strokeWidth={1.1}
        strokeDasharray="3 3"
      />
    </g>
  );
}

export function BlueprintFloorPlanSvg({
  plan,
  title,
}: {
  plan: FloorPlan;
  title?: string;
}) {
  const roomLookup: Record<string, FloorPlanRoom> = {};
  for (const r of plan.rooms) {
    roomLookup[r.id] = r;
  }

  const gridCols: number[] = [];
  for (let x = 20; x < BLUEPRINT_SVG_WIDTH; x += 28) gridCols.push(x);
  const gridRows: number[] = [];
  for (let y = 20; y < BLUEPRINT_SVG_HEIGHT; y += 28) gridRows.push(y);

  return (
    <svg
      viewBox={`0 0 ${BLUEPRINT_SVG_WIDTH} ${BLUEPRINT_SVG_HEIGHT}`}
      role="img"
      aria-label={
        title
          ? `Illustrative 2D architectural blueprint for ${title}`
          : "Illustrative 2D architectural blueprint"
      }
      className="h-auto w-full rounded-[16px] bg-[#0B2545]"
    >
      {/* Blueprint paper base */}
      <rect
        x={0}
        y={0}
        width={BLUEPRINT_SVG_WIDTH}
        height={BLUEPRINT_SVG_HEIGHT}
        rx={16}
        fill={BLUEPRINT_BG_HEX}
      />

      {/* Subtle architectural grid lines */}
      <g stroke="#60A5FA" strokeOpacity={0.14} strokeWidth={0.8}>
        {gridCols.map((gx) => (
          <line key={`gx-${gx}`} x1={gx} y1={16} x2={gx} y2={BLUEPRINT_SVG_HEIGHT - 16} />
        ))}
        {gridRows.map((gy) => (
          <line key={`gy-${gy}`} x1={16} y1={gy} x2={BLUEPRINT_SVG_WIDTH - 16} y2={gy} />
        ))}
      </g>

      {/* Blueprint frame border */}
      <rect
        x={14}
        y={14}
        width={BLUEPRINT_SVG_WIDTH - 28}
        height={BLUEPRINT_SVG_HEIGHT - 28}
        rx={10}
        fill="none"
        stroke="#93C5FD"
        strokeOpacity={0.4}
        strokeWidth={1.2}
      />

      {/* Room enclosures */}
      {plan.rooms.map((room) => {
        const { x, y, w, h } = roomToBlueprintRect(room);
        const fontSize = w < 110 ? 11 : 13;
        return (
          <g key={room.id}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              fill="#1E3A5F"
              fillOpacity={0.35}
              stroke="#F8FAFC"
              strokeWidth={2.2}
            />
            <text
              x={x + w / 2}
              y={y + h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#F8FAFC"
              fontSize={fontSize}
              fontWeight={600}
              letterSpacing="0.03em"
            >
              {room.name.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* Doors and windows */}
      {plan.openings.map((op, idx) => renderOpening(op, roomLookup[op.roomId], idx))}

      {/* Bottom Legend + Disclaimer Bar */}
      <g transform={`translate(28, ${BLUEPRINT_SVG_HEIGHT - 44})`}>
        <line x1={0} y1={10} x2={24} y2={10} stroke="#F8FAFC" strokeWidth={2.5} />
        <text x={32} y={14} fill="#CBD5E1" fontSize={11}>
          Wall
        </text>

        <line x1={84} y1={10} x2={104} y2={10} stroke="#F8FAFC" strokeWidth={1.5} />
        <path
          d="M 104 10 A 14 14 0 0 0 90 -2"
          fill="none"
          stroke="#93C5FD"
          strokeWidth={1.2}
          strokeDasharray="2 2"
        />
        <text x={114} y={14} fill="#CBD5E1" fontSize={11}>
          Door
        </text>

        <line x1={164} y1={8} x2={192} y2={8} stroke="#93C5FD" strokeWidth={1.5} />
        <line x1={164} y1={12} x2={192} y2={12} stroke="#93C5FD" strokeWidth={1.5} />
        <text x={202} y={14} fill="#CBD5E1" fontSize={11}>
          Window
        </text>

        <text
          x={BLUEPRINT_SVG_WIDTH - 56}
          y={14}
          textAnchor="end"
          fill="#E3A93B"
          fontSize={11}
          fontWeight={600}
        >
          {BLUEPRINT_DISCLAIMER}
        </text>
      </g>
    </svg>
  );
}

interface BlueprintFloorPlanViewerProps {
  listingId: string;
  listingTitle: string;
  initialFloorPlan: ListingFloorPlan | null;
  canGenerate: boolean;
  isAdmin: boolean;
}

export function BlueprintFloorPlanViewer({
  listingId,
  listingTitle,
  initialFloorPlan,
  canGenerate,
  isAdmin,
}: BlueprintFloorPlanViewerProps) {
  const [floorPlan, setFloorPlan] = useState<ListingFloorPlan | null>(initialFloorPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const handleGenerate = async (regenerate = false) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/listings/${listingId}/floor-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerate }),
      });
      const json = (await res.json()) as {
        floorPlan?: ListingFloorPlan;
        error?: string;
      };
      if (!res.ok || !json.floorPlan) {
        setError(json.error ?? "Could not generate floor plan.");
        return;
      }
      setFloorPlan(json.floorPlan);
    } catch {
      setError("Network error while generating 2D floor plan.");
    } finally {
      setLoading(false);
    }
  };

  if (!floorPlan) {
    return (
      <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-6 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#DDEEE9] text-[#0E6B5B]">
          <Layers className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="space-y-1">
          <p className="font-heading text-base font-bold text-[#17211F]">
            2D Blueprint Plan not generated yet
          </p>
          <p className="max-w-sm text-xs text-[#5B6663]">
            An illustrative 2D room diagram can be generated from the uploaded photos
            and room details.
          </p>
        </div>

        {error && (
          <p role="alert" className="max-w-md text-xs font-medium text-[#B3261E]">
            {error}
          </p>
        )}

        {canGenerate && (
          <Button
            type="button"
            disabled={loading}
            onClick={() => handleGenerate(false)}
          >
            <Sparkles className="h-4 w-4" strokeWidth={2} />
            <span>{loading ? "Generating 2D plan..." : "Generate 2D plan"}</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-heading text-sm font-bold text-[#17211F]">
            2D Blueprint · Illustrative Layout
          </p>
          <p className="text-xs text-[#5B6663]">{floorPlan.plan.summary}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => handleGenerate(true)}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                strokeWidth={2}
              />
              <span>{loading ? "Regenerating..." : "Regenerate"}</span>
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

      {error && (
        <p role="alert" className="text-xs font-medium text-[#B3261E]">
          {error}
        </p>
      )}

      <BlueprintFloorPlanSvg plan={floorPlan.plan} title={listingTitle} />

      <p className="text-xs font-medium text-[#5B6663]">
        Illustrative layout, not to scale. Inspect rooms in person to verify exact
        dimensions.
      </p>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-4xl p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle>2D Floor Plan · {listingTitle}</DialogTitle>
            <DialogDescription>
              Illustrative layout, not to scale.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3">
            <BlueprintFloorPlanSvg plan={floorPlan.plan} title={listingTitle} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
