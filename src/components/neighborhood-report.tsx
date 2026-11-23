import {
  AlertTriangle,
  Car,
  CheckCircle2,
  CloudRain,
  Droplets,
  MinusCircle,
  Shield,
  Signal,
  Trash2,
  Zap,
} from "lucide-react";
import {
  countGoodFactors,
  getNeighborhoodFactorRows,
  getNeighborhoodHeadsups,
  type FactorRatingTone,
  type NeighborhoodFactorDisplay,
} from "@/lib/neighborhood";
import { cn } from "@/lib/utils";
import type { ListingEnvironment } from "@/types/database";

const FACTOR_ICON_MAP: Record<
  NeighborhoodFactorDisplay["key"],
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  power: Zap,
  road: Car,
  flooding: CloudRain,
  waste: Trash2,
  water: Droplets,
  security: Shield,
  network: Signal,
};

function RatingBadge({
  tone,
  label,
}: {
  tone: FactorRatingTone;
  label: string;
}) {
  if (tone === "good") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DDEEE9] px-2.5 py-1 text-xs font-semibold text-[#0E6B5B]">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        <span>{label}</span>
      </span>
    );
  }
  if (tone === "fair") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-[#E3A93B] bg-[#FBF4E4] px-2.5 py-1 text-xs font-semibold text-[#6E4D07]">
        <MinusCircle className="h-3.5 w-3.5 shrink-0 text-[#9B6B0A]" strokeWidth={2} />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FBE9E7] px-2.5 py-1 text-xs font-semibold text-[#B3261E]">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
      <span>{label}</span>
    </span>
  );
}

export function NeighborhoodReport({
  environment,
}: {
  environment: ListingEnvironment;
}) {
  const headsups = getNeighborhoodHeadsups(environment);
  const rows = getNeighborhoodFactorRows(environment);
  const goodCount = countGoodFactors(environment);

  return (
    <section aria-labelledby="neighborhood-heading" className="space-y-3">
      {headsups.length > 0 && (
        <div
          role="alert"
          className="rounded-[20px] border-[1.5px] border-[#B3261E]/35 bg-[#FBE9E7] p-4 text-[#17211F]"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-[#B3261E]"
              strokeWidth={2}
            />
            <div className="space-y-1">
              <p className="font-heading text-sm font-bold text-[#B3261E]">
                Heads-up before you visit
              </p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-[#17211F]">
                {headsups.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-5">
        <div className="flex items-center justify-between gap-3 border-b-[1.5px] border-[#E2DFD6] pb-3.5">
          <div>
            <h2
              id="neighborhood-heading"
              className="font-heading text-lg font-bold text-[#17211F]"
            >
              Neighborhood and environment
            </h2>
            <p className="text-xs text-[#5B6663]">
              Reported by the landlord so there are no surprises
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-[#DDEEE9] px-3 py-1 text-xs font-semibold text-[#0E6B5B]">
            {goodCount} of 7 good
          </span>
        </div>

        <ul className="divide-y divide-[#E2DFD6]">
          {rows.map((row) => {
            const Icon = FACTOR_ICON_MAP[row.key];
            return (
              <li
                key={row.key}
                className="flex items-center justify-between gap-3 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#DDEEE9] text-[#0E6B5B]"
                    )}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#17211F]">{row.label}</p>
                    {row.detailText && (
                      <p className="text-xs text-[#5B6663]">{row.detailText}</p>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <RatingBadge tone={row.tone} label={row.valueLabel} />
                </div>
              </li>
            );
          })}
        </ul>

        {environment.note && environment.note.trim().length > 0 && (
          <div className="mt-3 rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-[#F6F4EF] p-3.5">
            <p className="text-xs font-semibold text-[#5B6663]">Landlord note</p>
            <p className="mt-1 text-sm text-[#17211F]">{environment.note}</p>
          </div>
        )}
      </div>
    </section>
  );
}
