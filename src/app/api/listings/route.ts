import { NextResponse, type NextRequest } from "next/server";
import { browseListings } from "@/lib/data/queries";
import type { PropertyType } from "@/types/database";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const offset = Number(searchParams.get("offset") ?? "0") || 0;
  const maxRentRaw = searchParams.get("maxRent");
  const minBedroomsRaw = searchParams.get("minBedrooms");

  const result = await browseListings({
    q: searchParams.get("q") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    lga: searchParams.get("lga") ?? undefined,
    chip: (searchParams.get("chip") as "all" | "flat" | "house" | "room" | null) ?? "all",
    propertyType: (searchParams.get("propertyType") as PropertyType | null) ?? undefined,
    maxRent: maxRentRaw ? Number(maxRentRaw) : undefined,
    minBedrooms: minBedroomsRaw ? Number(minBedroomsRaw) : undefined,
    furnishedOnly: searchParams.get("furnishedOnly") === "true",
    tarredRoad: searchParams.get("tarredRoad") === "true",
    steadyElectricity: searchParams.get("steadyElectricity") === "true",
    regularWaste: searchParams.get("regularWaste") === "true",
    waterAvailable: searchParams.get("waterAvailable") === "true",
    lowFloodRisk: searchParams.get("lowFloodRisk") === "true",
    offset,
  });

  return NextResponse.json(result);
}
