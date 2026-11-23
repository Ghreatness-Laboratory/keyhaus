import type { ListingEnvironment } from "@/types/database";

export type FactorRatingTone = "good" | "fair" | "poor";

export interface NeighborhoodFactorDisplay {
  key:
    | "power"
    | "road"
    | "flooding"
    | "waste"
    | "water"
    | "security"
    | "network";
  label: string;
  valueLabel: string;
  detailText?: string;
  tone: FactorRatingTone;
}

export function isPowerGood(env: Pick<ListingEnvironment, "power_grid">): boolean {
  return env.power_grid === "steady";
}

export function isRoadGood(
  env: Pick<ListingEnvironment, "road_surface" | "road_condition">
): boolean {
  return env.road_surface === "tarred" && env.road_condition === "good";
}

export function isFloodingGood(env: Pick<ListingEnvironment, "flooding">): boolean {
  return env.flooding === "none";
}

export function isWasteGood(env: Pick<ListingEnvironment, "waste">): boolean {
  return env.waste === "regular";
}

export function isWaterGood(env: Pick<ListingEnvironment, "water">): boolean {
  return env.water === "running_water" || env.water === "borehole";
}

export function isSecurityGood(env: Pick<ListingEnvironment, "security">): boolean {
  return env.security === "good";
}

export function isNetworkGood(env: Pick<ListingEnvironment, "network">): boolean {
  return env.network === "good";
}

/**
 * Counts how many of the 7 neighborhood factors are rated good.
 * Never invents a hidden score.
 */
export function countGoodFactors(
  env: Pick<
    ListingEnvironment,
    | "power_grid"
    | "road_surface"
    | "road_condition"
    | "flooding"
    | "waste"
    | "water"
    | "security"
    | "network"
  >
): number {
  let count = 0;
  if (isPowerGood(env)) count += 1;
  if (isRoadGood(env)) count += 1;
  if (isFloodingGood(env)) count += 1;
  if (isWasteGood(env)) count += 1;
  if (isWaterGood(env)) count += 1;
  if (isSecurityGood(env)) count += 1;
  if (isNetworkGood(env)) count += 1;
  return count;
}

export function formatNeighborhoodSummary(
  env: Pick<
    ListingEnvironment,
    | "power_grid"
    | "road_surface"
    | "road_condition"
    | "flooding"
    | "waste"
    | "water"
    | "security"
    | "network"
  >
): string {
  return `${countGoodFactors(env)} of 7 good`;
}

/**
 * Plain-English warnings shown in the Heads-up banner above the Neighborhood card.
 */
export function getNeighborhoodHeadsups(
  env: Pick<
    ListingEnvironment,
    "power_grid" | "road_surface" | "road_condition" | "flooding" | "waste"
  >
): string[] {
  const warnings: string[] = [];

  if (env.power_grid === "poor") {
    warnings.push("Grid electricity in this area is poor and infrequent.");
  } else if (env.power_grid === "none") {
    warnings.push("There is no grid electricity connected to this property.");
  }

  if (env.road_surface === "untarred" && env.road_condition === "bad") {
    warnings.push("The road to this home is not tarred and is in bad condition.");
  }

  if (env.flooding === "often") {
    warnings.push("This street often floods during the rainy season.");
  }

  if (env.waste === "none") {
    warnings.push("There is no regular waste collection in this area.");
  }

  return warnings;
}

export function getNeighborhoodFactorRows(
  env: ListingEnvironment
): NeighborhoodFactorDisplay[] {
  const powerLabelMap: Record<ListingEnvironment["power_grid"], string> = {
    steady: "Steady",
    fair: "Fair",
    poor: "Poor",
    none: "None",
  };
  const powerToneMap: Record<ListingEnvironment["power_grid"], FactorRatingTone> = {
    steady: "good",
    fair: "fair",
    poor: "poor",
    none: "poor",
  };

  const backupList = (env.power_backup ?? []).filter((item) => item !== "none");
  const powerDetails: string[] = [];
  if (typeof env.grid_hours_per_day === "number") {
    powerDetails.push(`~${env.grid_hours_per_day} hrs/day`);
  }
  if (backupList.length > 0) {
    powerDetails.push(`Backup: ${backupList.join(", ")}`);
  }

  const surfaceMap: Record<ListingEnvironment["road_surface"], string> = {
    tarred: "Tarred",
    partly_tarred: "Partly tarred",
    untarred: "Untarred",
  };
  const conditionMap: Record<ListingEnvironment["road_condition"], string> = {
    good: "Good",
    fair: "Fair",
    bad: "Bad",
  };
  const roadTone: FactorRatingTone = isRoadGood(env)
    ? "good"
    : env.road_condition === "bad"
      ? "poor"
      : "fair";

  const floodingMap: Record<ListingEnvironment["flooding"], string> = {
    none: "None",
    sometimes: "Sometimes",
    often: "Often",
  };
  const floodingTone: Record<ListingEnvironment["flooding"], FactorRatingTone> = {
    none: "good",
    sometimes: "fair",
    often: "poor",
  };

  const wasteMap: Record<ListingEnvironment["waste"], string> = {
    regular: "Regular collection",
    irregular: "Irregular",
    none: "None",
  };
  const wasteTone: Record<ListingEnvironment["waste"], FactorRatingTone> = {
    regular: "good",
    irregular: "fair",
    none: "poor",
  };

  const waterMap: Record<ListingEnvironment["water"], string> = {
    running_water: "Running water",
    borehole: "Borehole",
    vendor_well: "Vendor or well",
    none: "None",
  };
  const waterTone: Record<ListingEnvironment["water"], FactorRatingTone> = {
    running_water: "good",
    borehole: "good",
    vendor_well: "fair",
    none: "poor",
  };

  const qualityMap: Record<ListingEnvironment["security"], string> = {
    good: "Good",
    fair: "Fair",
    poor: "Poor",
  };
  const qualityTone: Record<ListingEnvironment["security"], FactorRatingTone> = {
    good: "good",
    fair: "fair",
    poor: "poor",
  };

  return [
    {
      key: "power",
      label: "Electricity",
      valueLabel: powerLabelMap[env.power_grid],
      detailText: powerDetails.length > 0 ? powerDetails.join(" · ") : undefined,
      tone: powerToneMap[env.power_grid],
    },
    {
      key: "road",
      label: "Access road",
      valueLabel: `${surfaceMap[env.road_surface]} · ${conditionMap[env.road_condition]}`,
      tone: roadTone,
    },
    {
      key: "flooding",
      label: "Rainy-season flooding",
      valueLabel: floodingMap[env.flooding],
      tone: floodingTone[env.flooding],
    },
    {
      key: "waste",
      label: "Waste management",
      valueLabel: wasteMap[env.waste],
      tone: wasteTone[env.waste],
    },
    {
      key: "water",
      label: "Water supply",
      valueLabel: waterMap[env.water],
      tone: waterTone[env.water],
    },
    {
      key: "security",
      label: "Security",
      valueLabel: qualityMap[env.security],
      tone: qualityTone[env.security],
    },
    {
      key: "network",
      label: "Mobile network",
      valueLabel: qualityMap[env.network],
      tone: qualityTone[env.network],
    },
  ];
}
