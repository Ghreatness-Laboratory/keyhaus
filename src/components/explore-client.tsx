"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox, Label } from "@/components/ui/label";
import { BROWSE_CHIP_GROUPS, BROWSE_PAGE_SIZE } from "@/lib/constants";
import { getAllStates, getLgasForState } from "@/lib/locations";
import { cn } from "@/lib/utils";
import type { BrowseFilters, ListingCardData } from "@/types/database";

interface ExploreClientProps {
  initialItems: ListingCardData[];
  initialHasMore: boolean;
  isSignedIn: boolean;
}

export function ExploreClient({
  initialItems,
  initialHasMore,
  isSignedIn,
}: ExploreClientProps) {
  const [items, setItems] = useState<ListingCardData[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  const [q, setQ] = useState("");
  const [chip, setChip] = useState<"all" | "flat" | "house" | "room">("all");
  const [stateFilter, setStateFilter] = useState("");
  const [lgaFilter, setLgaFilter] = useState("");
  const [maxRent, setMaxRent] = useState("");
  const [minBedrooms, setMinBedrooms] = useState("");
  const [furnishedOnly, setFurnishedOnly] = useState(false);

  // Neighborhood filters
  const [tarredRoad, setTarredRoad] = useState(false);
  const [steadyElectricity, setSteadyElectricity] = useState(false);
  const [regularWaste, setRegularWaste] = useState(false);
  const [waterAvailable, setWaterAvailable] = useState(false);
  const [lowFloodRisk, setLowFloodRisk] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);

  const allStates = useMemo(() => getAllStates(), []);
  const availableLgas = useMemo(
    () => (stateFilter ? getLgasForState(stateFilter) : []),
    [stateFilter]
  );

  const activeFilterCount = [
    stateFilter,
    lgaFilter,
    maxRent,
    minBedrooms,
    furnishedOnly,
    tarredRoad,
    steadyElectricity,
    regularWaste,
    waterAvailable,
    lowFloodRisk,
  ].filter(Boolean).length;

  const buildQueryString = useCallback(
    (offset: number, overrides?: Partial<BrowseFilters>) => {
      const params = new URLSearchParams();
      const effectiveChip = overrides?.chip ?? chip;
      const effectiveQ = overrides?.q ?? q;

      if (effectiveQ.trim()) params.set("q", effectiveQ.trim());
      if (stateFilter) params.set("state", stateFilter);
      if (lgaFilter) params.set("lga", lgaFilter);
      if (effectiveChip !== "all") params.set("chip", effectiveChip);
      if (maxRent) params.set("maxRent", maxRent);
      if (minBedrooms) params.set("minBedrooms", minBedrooms);
      if (furnishedOnly) params.set("furnishedOnly", "true");
      if (tarredRoad) params.set("tarredRoad", "true");
      if (steadyElectricity) params.set("steadyElectricity", "true");
      if (regularWaste) params.set("regularWaste", "true");
      if (waterAvailable) params.set("waterAvailable", "true");
      if (lowFloodRisk) params.set("lowFloodRisk", "true");
      params.set("offset", String(offset));
      return params.toString();
    },
    [
      chip,
      furnishedOnly,
      lgaFilter,
      lowFloodRisk,
      maxRent,
      minBedrooms,
      q,
      regularWaste,
      stateFilter,
      steadyElectricity,
      tarredRoad,
      waterAvailable,
    ]
  );

  const fetchResults = useCallback(
    async (offset: number, append: boolean, overrides?: Partial<BrowseFilters>) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      try {
        const qs = buildQueryString(offset, overrides);
        const res = await fetch(`/api/listings?${qs}`);
        if (!res.ok) return;
        const json = (await res.json()) as {
          items: ListingCardData[];
          hasMore: boolean;
        };
        setItems((prev) => (append ? [...prev, ...json.items] : json.items));
        setHasMore(json.hasMore);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildQueryString]
  );

  // Re-fetch when search or filters change (debounced for typing)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchResults(0, false);
    }, 220);
    return () => window.clearTimeout(timer);
  }, [fetchResults]);

  // Infinite scroll observer (loads 12 at a time)
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore || loadingMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !loadingMore) {
          void fetchResults(items.length, true);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchResults, hasMore, items.length, loading, loadingMore]);

  const resetAllFilters = () => {
    setQ("");
    setChip("all");
    setStateFilter("");
    setLgaFilter("");
    setMaxRent("");
    setMinBedrooms("");
    setFurnishedOnly(false);
    setTarredRoad(false);
    setSteadyElectricity(false);
    setRegularWaste(false);
    setWaterAvailable(false);
    setLowFloodRisk(false);
  };

  return (
    <div className="space-y-5">
      {/* Search + Filter Sheet trigger */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6663]"
              strokeWidth={2}
            />
            <Input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search state, LGA, or area (e.g. Ikeja, Wuse)"
              aria-label="Search by state, LGA, or area"
              className="pl-10 pr-10"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="absolute right-1 top-1/2 inline-flex h-[40px] w-[40px] -translate-y-1/2 items-center justify-center rounded-full text-[#5B6663] hover:text-[#17211F]"
              >
                <X className="h-4 w-4" strokeWidth={2} />
              </button>
            )}
          </div>

          <Dialog open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="shrink-0 justify-center">
                <SlidersHorizontal className="h-4 w-4" strokeWidth={2} />
                <span>
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                </span>
              </Button>
            </DialogTrigger>

            <DialogContent variant="sheet">
              <DialogHeader>
                <DialogTitle>Filter homes and neighborhood</DialogTitle>
                <DialogDescription>
                  Filter by Nigerian location, budget, and real neighborhood conditions.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-5 space-y-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="filter-state">State</Label>
                    <select
                      id="filter-state"
                      value={stateFilter}
                      onChange={(e) => {
                        setStateFilter(e.target.value);
                        setLgaFilter("");
                      }}
                      className="min-h-[44px] w-full rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-white px-3 text-sm text-[#17211F]"
                    >
                      <option value="">All 36 states & FCT</option>
                      {allStates.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="filter-lga">LGA</Label>
                    <select
                      id="filter-lga"
                      value={lgaFilter}
                      disabled={!stateFilter}
                      onChange={(e) => setLgaFilter(e.target.value)}
                      className="min-h-[44px] w-full rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-white px-3 text-sm text-[#17211F] disabled:opacity-50"
                    >
                      <option value="">All LGAs</option>
                      {availableLgas.map((lga) => (
                        <option key={lga} value={lga}>
                          {lga}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="filter-max-rent">Max rent (₦)</Label>
                    <Input
                      id="filter-max-rent"
                      type="number"
                      min={0}
                      step={50000}
                      placeholder="e.g. 3000000"
                      value={maxRent}
                      onChange={(e) => setMaxRent(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="filter-bedrooms">Minimum bedrooms</Label>
                    <select
                      id="filter-bedrooms"
                      value={minBedrooms}
                      onChange={(e) => setMinBedrooms(e.target.value)}
                      className="min-h-[44px] w-full rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-white px-3 text-sm text-[#17211F]"
                    >
                      <option value="">Any</option>
                      <option value="1">1+ bedroom</option>
                      <option value="2">2+ bedrooms</option>
                      <option value="3">3+ bedrooms</option>
                      <option value="4">4+ bedrooms</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 rounded-[18px] border-[1.5px] border-[#E2DFD6] bg-white p-4">
                  <p className="font-heading text-sm font-semibold text-[#17211F]">
                    Neighborhood &amp; environment filters
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      {
                        id: "flt-tarred",
                        label: "Tarred road",
                        checked: tarredRoad,
                        set: setTarredRoad,
                      },
                      {
                        id: "flt-power",
                        label: "Steady electricity",
                        checked: steadyElectricity,
                        set: setSteadyElectricity,
                      },
                      {
                        id: "flt-waste",
                        label: "Regular waste collection",
                        checked: regularWaste,
                        set: setRegularWaste,
                      },
                      {
                        id: "flt-water",
                        label: "Water available",
                        checked: waterAvailable,
                        set: setWaterAvailable,
                      },
                      {
                        id: "flt-flood",
                        label: "Low flood risk",
                        checked: lowFloodRisk,
                        set: setLowFloodRisk,
                      },
                      {
                        id: "flt-furnished",
                        label: "Furnished only",
                        checked: furnishedOnly,
                        set: setFurnishedOnly,
                      },
                    ].map((opt) => (
                      <label
                        key={opt.id}
                        htmlFor={opt.id}
                        className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[12px] px-2 hover:bg-[#F6F4EF]"
                      >
                        <Checkbox
                          id={opt.id}
                          checked={opt.checked}
                          onCheckedChange={(v) => opt.set(Boolean(v))}
                        />
                        <span className="text-sm text-[#17211F]">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={resetAllFilters}>
                    Clear all
                  </Button>
                  <Button type="button" onClick={() => setFilterSheetOpen(false)}>
                    Show {items.length} {items.length === 1 ? "home" : "homes"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter chips (All, Flat, House, Room) */}
        <div
          role="tablist"
          aria-label="Property type filter"
          className="flex items-center gap-2 overflow-x-auto pb-1"
        >
          {BROWSE_CHIP_GROUPS.map((group) => {
            const active = chip === group.value;
            return (
              <button
                key={group.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setChip(group.value)}
                className={cn(
                  "inline-flex min-h-[44px] shrink-0 items-center rounded-full px-5 text-sm font-medium transition-colors cursor-pointer",
                  active
                    ? "bg-[#0E6B5B] text-white"
                    : "border-[1.5px] border-[#E2DFD6] bg-white text-[#17211F] hover:bg-[#DDEEE9]"
                )}
              >
                {group.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="font-heading text-xl font-bold text-[#17211F]">
          Homes to rent in Nigeria
        </h1>
        <p className="text-xs font-medium text-[#5B6663] tabular-nums">
          {items.length} {items.length === 1 ? "place" : "places"}
        </p>
      </div>

      {/* Listing Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="overflow-hidden rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white"
            >
              <div className="aspect-[4/3] animate-pulse bg-[#DDEEE9]" />
              <div className="space-y-2.5 p-4">
                <div className="h-5 w-1/2 animate-pulse rounded bg-[#E2DFD6]" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-[#E2DFD6]" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-[#E2DFD6]" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-8 text-center">
          <p className="font-heading text-lg font-semibold text-[#17211F]">
            No homes match those filters
          </p>
          <p className="mt-1 text-sm text-[#5B6663]">
            Try clearing one of your neighborhood filters or broadening your location.
          </p>
          <Button className="mt-4" variant="outline" onClick={resetAllFilters}>
            Reset filters
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ListingCard key={item.id} listing={item} isSignedIn={isSignedIn} />
            ))}
          </div>

          <div ref={sentinelRef} className="flex justify-center pt-4">
            {hasMore && (
              <Button
                variant="outline"
                disabled={loadingMore}
                onClick={() => void fetchResults(items.length, true)}
              >
                {loadingMore
                  ? "Loading more homes..."
                  : `Load next ${BROWSE_PAGE_SIZE} homes`}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
