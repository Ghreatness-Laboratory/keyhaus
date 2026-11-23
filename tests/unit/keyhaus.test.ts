import { describe, expect, it } from "vitest";
import { detectRoomKindFromRatio } from "@/lib/image-compression";
import {
  countGoodFactors,
  formatNeighborhoodSummary,
  getNeighborhoodHeadsups,
} from "@/lib/neighborhood";
import {
  buildWhatsAppUrl,
  calculateMoveInTotal,
  formatNaira,
  normalizeNigerianPhone,
} from "@/lib/nigeria";

describe("Nigerian phone normalization", () => {
  it("accepts and normalizes valid Nigerian mobile numbers", () => {
    expect(normalizeNigerianPhone("08031234567")).toBe("+2348031234567");
    expect(normalizeNigerianPhone("07012345678")).toBe("+2347012345678");
    expect(normalizeNigerianPhone("09011234567")).toBe("+2349011234567");
    expect(normalizeNigerianPhone("0803 123 4567")).toBe("+2348031234567");
    expect(normalizeNigerianPhone("2348031234567")).toBe("+2348031234567");
    expect(normalizeNigerianPhone("+2348031234567")).toBe("+2348031234567");
  });

  it("rejects invalid Nigerian mobile numbers", () => {
    expect(normalizeNigerianPhone("0601234567")).toBeNull();
    expect(normalizeNigerianPhone("12345")).toBeNull();
    expect(normalizeNigerianPhone("+14155552671")).toBeNull();
    expect(normalizeNigerianPhone("")).toBeNull();
  });
});

describe("Naira formatting & move-in total", () => {
  it("formats whole naira without decimals", () => {
    expect(formatNaira(2800000)).toBe("₦2,800,000");
    expect(formatNaira(450000)).toBe("₦450,000");
  });

  it("calculates estimated total to move in", () => {
    expect(
      calculateMoveInTotal({
        rentAmount: 1500000,
        agencyFee: 150000,
        legalFee: 75000,
        cautionFee: 100000,
      })
    ).toBe(1825000);

    expect(
      calculateMoveInTotal({
        rentAmount: 900000,
        agencyFee: null,
        legalFee: undefined,
        cautionFee: 0,
      })
    ).toBe(900000);
  });

  it("builds a properly encoded WhatsApp link", () => {
    const url = buildWhatsAppUrl("08031234567", "2-Bedroom Flat in Ikeja");
    expect(url).toContain("https://wa.me/2348031234567?text=");
    expect(url).toContain(encodeURIComponent("2-Bedroom Flat in Ikeja"));
  });
});

describe("Neighborhood summary & heads-up rules", () => {
  it("counts good factors out of 7 accurately", () => {
    const env = {
      power_grid: "steady" as const,
      road_surface: "tarred" as const,
      road_condition: "good" as const,
      flooding: "none" as const,
      waste: "regular" as const,
      water: "borehole" as const,
      security: "fair" as const,
      network: "poor" as const,
    };
    expect(countGoodFactors(env)).toBe(5);
    expect(formatNeighborhoodSummary(env)).toBe("5 of 7 good");
  });

  it("triggers heads-up warnings only for serious conditions", () => {
    expect(
      getNeighborhoodHeadsups({
        power_grid: "steady",
        road_surface: "tarred",
        road_condition: "good",
        flooding: "none",
        waste: "regular",
      })
    ).toEqual([]);

    const warnings = getNeighborhoodHeadsups({
      power_grid: "poor",
      road_surface: "untarred",
      road_condition: "bad",
      flooding: "often",
      waste: "none",
    });
    expect(warnings).toHaveLength(4);
    expect(warnings[1]).toContain("not tarred and is in bad condition");
  });
});

describe("Room panorama detection", () => {
  it("detects 2:1 equirectangular images as panorama", () => {
    expect(detectRoomKindFromRatio(4096, 2048)).toBe("panorama");
    expect(detectRoomKindFromRatio(2048, 1024)).toBe("panorama");
    expect(detectRoomKindFromRatio(1600, 1200)).toBe("flat");
  });
});
