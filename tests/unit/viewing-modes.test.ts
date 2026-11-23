import { afterEach, describe, expect, it } from "vitest";
import {
  computeOpeningGeometry,
  renderBlueprintFloorPlanSvgString,
  roomToBlueprintRect,
} from "@/lib/blueprint-svg";
import { getViewingModeFlags } from "@/lib/feature-flags";
import {
  getFallbackAreaCoordinates,
  roundCoordinateForAreaPrivacy,
} from "@/lib/geocoding";
import { floorPlanSchema, listingDetailsSchema } from "@/lib/schemas";
import type { FloorPlan } from "@/types/database";

describe("floorPlanSchema", () => {
  const validPlan: FloorPlan = {
    rooms: [
      {
        id: "r1",
        name: "Living Room",
        type: "living",
        xPct: 5,
        yPct: 8,
        widthPct: 50,
        heightPct: 48,
      },
      {
        id: "r2",
        name: "Bedroom",
        type: "bedroom",
        xPct: 57,
        yPct: 8,
        widthPct: 38,
        heightPct: 48,
      },
    ],
    openings: [
      { kind: "door", roomId: "r1", wall: "right", offsetPct: 50, widthPct: 14 },
      { kind: "window", roomId: "r1", wall: "top", offsetPct: 45, widthPct: 24 },
    ],
    summary: "2-room illustrative layout",
    isIllustrative: true,
  };

  it("accepts a valid architectural floor plan and preserves isIllustrative", () => {
    const parsed = floorPlanSchema.safeParse({
      rooms: validPlan.rooms,
      openings: validPlan.openings,
      summary: validPlan.summary,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isIllustrative).toBe(true);
      expect(parsed.data.rooms).toHaveLength(2);
    }
  });

  it("rejects rooms exceeding 100% bounds or empty room arrays", () => {
    const outOfBounds = floorPlanSchema.safeParse({
      ...validPlan,
      rooms: [
        {
          id: "r1",
          name: "Oversized",
          type: "living",
          xPct: 60,
          yPct: 10,
          widthPct: 50,
          heightPct: 40,
        },
      ],
    });
    expect(outOfBounds.success).toBe(false);

    const emptyRooms = floorPlanSchema.safeParse({
      ...validPlan,
      rooms: [],
    });
    expect(emptyRooms.success).toBe(false);
  });

  it("rejects invalid opening wall values", () => {
    const badOpening = floorPlanSchema.safeParse({
      ...validPlan,
      openings: [
        {
          kind: "door",
          roomId: "r1",
          wall: "diagonal",
          offsetPct: 50,
          widthPct: 12,
        },
      ],
    });
    expect(badOpening.success).toBe(false);
  });
});

describe("listingDetailsSchema optional size_sqm and matterport_url", () => {
  const baseDetails = {
    title: "Clean 2-Bedroom Flat in Yaba",
    description: "Spacious living room with prepaid meter and borehole water.",
    property_type: "flat" as const,
    rent_amount: 1800000,
    rent_period: "year" as const,
    agency_fee: null,
    legal_fee: null,
    caution_fee: null,
    bedrooms: 2,
    bathrooms: 2,
    furnished: false,
    amenities: ["prepaid_meter"],
    state: "Lagos",
    lga: "Yaba",
    area: "Yaba",
    address_line: "14 Herbert Macaulay Way",
  };

  it("accepts null, undefined, and valid integer size_sqm while rejecting too-small sizes", () => {
    expect(
      listingDetailsSchema.safeParse({ ...baseDetails, size_sqm: null }).success
    ).toBe(true);
    expect(
      listingDetailsSchema.safeParse({ ...baseDetails, size_sqm: undefined }).success
    ).toBe(true);
    expect(
      listingDetailsSchema.safeParse({ ...baseDetails, size_sqm: 115 }).success
    ).toBe(true);
    expect(
      listingDetailsSchema.safeParse({ ...baseDetails, size_sqm: 2 }).success
    ).toBe(false);
  });

  it("validates Matterport URLs strictly to HTTPS Matterport domains", () => {
    expect(
      listingDetailsSchema.safeParse({
        ...baseDetails,
        matterport_url: "https://my.matterport.com/show/?m=abc123",
      }).success
    ).toBe(true);
    expect(
      listingDetailsSchema.safeParse({
        ...baseDetails,
        matterport_url: "http://evil.example.com",
      }).success
    ).toBe(false);
  });
});

describe("roundCoordinateForAreaPrivacy", () => {
  it("rounds exact coordinates onto a deterministic ~380-400m privacy grid", () => {
    const exact = { latitude: 6.583912, longitude: 3.357421 };
    const rounded = roundCoordinateForAreaPrivacy(exact.latitude, exact.longitude);

    expect(Math.abs(rounded.latitude - exact.latitude)).toBeLessThanOrEqual(0.0035);
    expect(Math.abs(rounded.longitude - exact.longitude)).toBeLessThanOrEqual(0.0035);
    expect(rounded.latitude).not.toBe(exact.latitude);
  });

  it("falls back cleanly to area centroid in Nigeria when unconfigured", () => {
    const coords = getFallbackAreaCoordinates({
      area: "Ikeja GRA",
      lga: "Ikeja",
      state: "Lagos",
    });
    expect(coords.latitude).toBeGreaterThan(6);
    expect(coords.longitude).toBeGreaterThan(3);
  });
});

describe("getViewingModeFlags", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("defaults all viewing modes to enabled and supports false/0 overrides", () => {
    delete process.env.FEATURE_AREA_VIEW;
    delete process.env.FEATURE_STREET_VIEW;
    delete process.env.FEATURE_2D_PLAN;
    delete process.env.FEATURE_3D_VIEW;

    expect(getViewingModeFlags()).toEqual({
      areaView: true,
      streetView: true,
      floorPlan2d: true,
      view3d: true,
    });

    process.env.FEATURE_AREA_VIEW = "false";
    process.env.FEATURE_STREET_VIEW = "0";
    process.env.FEATURE_2D_PLAN = "true";
    process.env.FEATURE_3D_VIEW = "off";

    expect(getViewingModeFlags()).toEqual({
      areaView: false,
      streetView: false,
      floorPlan2d: true,
      view3d: false,
    });
  });
});

describe("blueprint SVG geometry & serialization", () => {
  it("maps room percentages into SVG blueprint coordinates and renders disclaimer", () => {
    const plan: FloorPlan = {
      rooms: [
        {
          id: "living",
          name: "Living Room",
          type: "living",
          xPct: 8,
          yPct: 10,
          widthPct: 50,
          heightPct: 45,
        },
      ],
      openings: [
        { kind: "door", roomId: "living", wall: "bottom", offsetPct: 50, widthPct: 15 },
        { kind: "window", roomId: "living", wall: "top", offsetPct: 50, widthPct: 24 },
      ],
      summary: "Compact studio layout",
      isIllustrative: true,
    };

    const rect = roomToBlueprintRect(plan.rooms[0]);
    expect(rect.w).toBeGreaterThan(300);
    expect(rect.h).toBeGreaterThan(150);

    const doorGeo = computeOpeningGeometry(plan.openings[0], plan.rooms[0]);
    expect(doorGeo?.kind).toBe("door");

    const svg = renderBlueprintFloorPlanSvgString(plan, "Test Apartment");
    expect(svg).toContain("<svg");
    expect(svg).toContain("#0B2545");
    expect(svg).toContain("LIVING ROOM");
    expect(svg).toContain("Illustrative layout, not to scale.");
    expect(svg).toContain("<path");
    expect(svg).toContain("Wall");
    expect(svg).toContain("Door");
    expect(svg).toContain("Window");
  });
});
