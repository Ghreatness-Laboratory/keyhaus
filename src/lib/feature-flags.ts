import type { ViewingModeFlags } from "@/types/database";

function parseFlag(value: string | undefined, defaultValue = true): boolean {
  if (value === undefined || value.trim() === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === "false" || normalized === "0" || normalized === "off" || normalized === "no") {
    return false;
  }
  if (normalized === "true" || normalized === "1" || normalized === "on" || normalized === "yes") {
    return true;
  }
  return defaultValue;
}

/**
 * Evaluates runtime feature flags on the server (with NEXT_PUBLIC_ fallback)
 * so each viewing mode can be switched off via environment config without a redeploy.
 */
export function getViewingModeFlags(): ViewingModeFlags {
  return {
    areaView: parseFlag(
      process.env.FEATURE_AREA_VIEW ?? process.env.NEXT_PUBLIC_FF_AREA_VIEW,
      true
    ),
    streetView: parseFlag(
      process.env.FEATURE_STREET_VIEW ?? process.env.NEXT_PUBLIC_FF_STREET_VIEW,
      true
    ),
    floorPlan2d: parseFlag(
      process.env.FEATURE_2D_PLAN ?? process.env.NEXT_PUBLIC_FF_2D_PLAN,
      true
    ),
    view3d: parseFlag(
      process.env.FEATURE_3D_VIEW ?? process.env.NEXT_PUBLIC_FF_3D_VIEW,
      true
    ),
  };
}
