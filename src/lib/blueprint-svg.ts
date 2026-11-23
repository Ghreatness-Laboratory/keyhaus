import type { FloorPlan, FloorPlanOpening, FloorPlanRoom } from "@/types/database";

export const BLUEPRINT_SVG_WIDTH = 800;
export const BLUEPRINT_SVG_HEIGHT = 560;
export const BLUEPRINT_PAD_X = 48;
export const BLUEPRINT_PAD_Y = 42;
export const BLUEPRINT_PLAN_W = BLUEPRINT_SVG_WIDTH - BLUEPRINT_PAD_X * 2;
export const BLUEPRINT_PLAN_H = BLUEPRINT_SVG_HEIGHT - BLUEPRINT_PAD_Y * 2 - 42;
export const BLUEPRINT_BG_HEX = "#0B2545";
export const BLUEPRINT_DISCLAIMER = "Illustrative layout, not to scale.";

export interface BlueprintRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function roomToBlueprintRect(room: FloorPlanRoom): BlueprintRect {
  return {
    x: BLUEPRINT_PAD_X + (room.xPct / 100) * BLUEPRINT_PLAN_W,
    y: BLUEPRINT_PAD_Y + (room.yPct / 100) * BLUEPRINT_PLAN_H,
    w: (room.widthPct / 100) * BLUEPRINT_PLAN_W,
    h: (room.heightPct / 100) * BLUEPRINT_PLAN_H,
  };
}

export type ComputedOpening =
  | {
      kind: "window";
      orientation: "horizontal";
      x1: number;
      x2: number;
      y: number;
    }
  | {
      kind: "window";
      orientation: "vertical";
      x: number;
      y1: number;
      y2: number;
    }
  | {
      kind: "door";
      gap: { x1: number; y1: number; x2: number; y2: number };
      leafLine: { x1: number; y1: number; x2: number; y2: number };
      arcPath: string;
    };

export function computeOpeningGeometry(
  opening: FloorPlanOpening,
  room: FloorPlanRoom | undefined
): ComputedOpening | null {
  if (!room) return null;
  const r = roomToBlueprintRect(room);
  const offset = Math.max(0.08, Math.min(0.92, opening.offsetPct / 100));
  const len =
    opening.wall === "top" || opening.wall === "bottom"
      ? Math.min(r.w * 0.45, Math.max(22, (opening.widthPct / 100) * r.w))
      : Math.min(r.h * 0.45, Math.max(22, (opening.widthPct / 100) * r.h));

  if (opening.kind === "window") {
    if (opening.wall === "top" || opening.wall === "bottom") {
      const y = opening.wall === "top" ? r.y : r.y + r.h;
      const cx = r.x + r.w * offset;
      return {
        kind: "window",
        orientation: "horizontal",
        x1: Math.max(r.x + 6, cx - len / 2),
        x2: Math.min(r.x + r.w - 6, cx + len / 2),
        y,
      };
    }
    const x = opening.wall === "left" ? r.x : r.x + r.w;
    const cy = r.y + r.h * offset;
    return {
      kind: "window",
      orientation: "vertical",
      x,
      y1: Math.max(r.y + 6, cy - len / 2),
      y2: Math.min(r.y + r.h - 6, cy + len / 2),
    };
  }

  const leaf = Math.min(34, Math.max(20, len * 0.85));
  if (opening.wall === "top") {
    const hx = Math.max(
      r.x + 8,
      Math.min(r.x + r.w - leaf - 8, r.x + r.w * offset - leaf / 2)
    );
    const hy = r.y;
    return {
      kind: "door",
      gap: { x1: hx, y1: hy, x2: hx + leaf, y2: hy },
      leafLine: { x1: hx, y1: hy, x2: hx, y2: hy + leaf },
      arcPath: `M ${hx} ${hy + leaf} A ${leaf} ${leaf} 0 0 0 ${hx + leaf} ${hy}`,
    };
  }
  if (opening.wall === "bottom") {
    const hx = Math.max(
      r.x + 8,
      Math.min(r.x + r.w - leaf - 8, r.x + r.w * offset - leaf / 2)
    );
    const hy = r.y + r.h;
    return {
      kind: "door",
      gap: { x1: hx, y1: hy, x2: hx + leaf, y2: hy },
      leafLine: { x1: hx, y1: hy, x2: hx, y2: hy - leaf },
      arcPath: `M ${hx} ${hy - leaf} A ${leaf} ${leaf} 0 0 1 ${hx + leaf} ${hy}`,
    };
  }
  if (opening.wall === "left") {
    const hx = r.x;
    const hy = Math.max(
      r.y + 8,
      Math.min(r.y + r.h - leaf - 8, r.y + r.h * offset - leaf / 2)
    );
    return {
      kind: "door",
      gap: { x1: hx, y1: hy, x2: hx, y2: hy + leaf },
      leafLine: { x1: hx, y1: hy, x2: hx + leaf, y2: hy },
      arcPath: `M ${hx + leaf} ${hy} A ${leaf} ${leaf} 0 0 1 ${hx} ${hy + leaf}`,
    };
  }

  const hx = r.x + r.w;
  const hy = Math.max(
    r.y + 8,
    Math.min(r.y + r.h - leaf - 8, r.y + r.h * offset - leaf / 2)
  );
  return {
    kind: "door",
    gap: { x1: hx, y1: hy, x2: hx, y2: hy + leaf },
    leafLine: { x1: hx, y1: hy, x2: hx - leaf, y2: hy },
    arcPath: `M ${hx - leaf} ${hy} A ${leaf} ${leaf} 0 0 0 ${hx} ${hy + leaf}`,
  };
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Pure string SVG serializer for Node/test validation matching BlueprintFloorPlanSvg.
 */
export function renderBlueprintFloorPlanSvgString(
  plan: FloorPlan,
  title?: string
): string {
  const roomLookup: Record<string, FloorPlanRoom> = {};
  for (const r of plan.rooms) roomLookup[r.id] = r;

  const roomsMarkup = plan.rooms
    .map((room) => {
      const r = roomToBlueprintRect(room);
      return `<g><rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" stroke="#F8FAFC" /><text x="${r.x + r.w / 2}" y="${r.y + r.h / 2}">${escapeXml(room.name.toUpperCase())}</text></g>`;
    })
    .join("");

  const openingsMarkup = plan.openings
    .map((op) => {
      const geo = computeOpeningGeometry(op, roomLookup[op.roomId]);
      if (!geo) return "";
      if (geo.kind === "window") {
        if (geo.orientation === "horizontal") {
          return `<line x1="${geo.x1}" y1="${geo.y}" x2="${geo.x2}" y2="${geo.y}" stroke="#93C5FD" />`;
        }
        return `<line x1="${geo.x}" y1="${geo.y1}" x2="${geo.x}" y2="${geo.y2}" stroke="#93C5FD" />`;
      }
      return `<g><line x1="${geo.leafLine.x1}" y1="${geo.leafLine.y1}" x2="${geo.leafLine.x2}" y2="${geo.leafLine.y2}" /><path d="${geo.arcPath}" /></g>`;
    })
    .join("");

  const aria = escapeXml(
    title
      ? `Illustrative 2D architectural blueprint for ${title}`
      : "Illustrative 2D architectural blueprint"
  );

  return `<svg viewBox="0 0 ${BLUEPRINT_SVG_WIDTH} ${BLUEPRINT_SVG_HEIGHT}" role="img" aria-label="${aria}"><rect width="${BLUEPRINT_SVG_WIDTH}" height="${BLUEPRINT_SVG_HEIGHT}" fill="${BLUEPRINT_BG_HEX}" />${roomsMarkup}${openingsMarkup}<g><text>Wall</text><text>Door</text><text>Window</text><text>${BLUEPRINT_DISCLAIMER}</text></g></svg>`;
}
