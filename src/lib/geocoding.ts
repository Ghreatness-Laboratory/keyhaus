import type { ListingCoordinates } from "@/types/database";

const AREA_CENTROID_FALLBACKS: Record<string, ListingCoordinates> = {
  "ikeja gra, lagos": { latitude: 6.585, longitude: 3.356 },
  "yaba, lagos": { latitude: 6.515, longitude: 3.377 },
  "lekki phase 1, lagos": { latitude: 6.447, longitude: 3.474 },
  "wuse ii, fct": { latitude: 9.076, longitude: 7.479 },
  "gwarinpa, fct": { latitude: 9.109, longitude: 7.404 },
  "lugbe, fct": { latitude: 8.972, longitude: 7.377 },
  "new gra, rivers": { latitude: 4.824, longitude: 7.001 },
  "choba, rivers": { latitude: 4.896, longitude: 6.912 },
  "old bodija, oyo": { latitude: 7.423, longitude: 3.908 },
  "nassarawa gra, kano": { latitude: 11.996, longitude: 8.545 },
};

const STATE_CENTROID_FALLBACKS: Record<string, ListingCoordinates> = {
  lagos: { latitude: 6.524, longitude: 3.379 },
  fct: { latitude: 9.076, longitude: 7.398 },
  rivers: { latitude: 4.815, longitude: 7.049 },
  oyo: { latitude: 7.377, longitude: 3.947 },
  kano: { latitude: 12.002, longitude: 8.591 },
};

/**
 * Quantizes exact coordinates to a ~350–450 m deterministic grid center
 * so Area View satellite maps never reveal the exact building.
 */
export function roundCoordinateForAreaPrivacy(
  latitude: number,
  longitude: number
): ListingCoordinates {
  // 0.0035 deg latitude is ~389 m; 0.0035 deg longitude in Nigeria is ~380–389 m.
  const step = 0.0035;
  const approxLat = Number((Math.round(latitude / step) * step).toFixed(5));
  const approxLng = Number((Math.round(longitude / step) * step).toFixed(5));
  return {
    latitude: approxLat,
    longitude: approxLng,
  };
}

export function getFallbackAreaCoordinates(params: {
  area: string;
  lga: string;
  state: string;
}): ListingCoordinates {
  const key = `${params.area.trim().toLowerCase()}, ${params.state.trim().toLowerCase()}`;
  if (AREA_CENTROID_FALLBACKS[key]) {
    return roundCoordinateForAreaPrivacy(
      AREA_CENTROID_FALLBACKS[key].latitude,
      AREA_CENTROID_FALLBACKS[key].longitude
    );
  }
  const stateKey = params.state.trim().toLowerCase();
  const stateMatch = STATE_CENTROID_FALLBACKS[stateKey];
  if (stateMatch) {
    return roundCoordinateForAreaPrivacy(stateMatch.latitude, stateMatch.longitude);
  }
  // Center of Nigeria fallback (Abuja)
  return roundCoordinateForAreaPrivacy(9.0765, 7.3986);
}

export interface GeocodeResult {
  exact: ListingCoordinates | null;
  approximate: ListingCoordinates;
  quotaExceeded: boolean;
  source: "google" | "fallback";
}

async function fetchGoogleGeocode(
  addressQuery: string,
  apiKey: string
): Promise<{
  coords: ListingCoordinates | null;
  quotaExceeded: boolean;
}> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", addressQuery);
  url.searchParams.set("region", "ng");
  url.searchParams.set("components", "country:NG");
  url.searchParams.set("key", apiKey);

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      cache: "no-store",
    });

    if (res.status === 429) {
      return { coords: null, quotaExceeded: true };
    }

    const json = (await res.json()) as {
      status?: string;
      results?: Array<{
        geometry?: {
          location?: { lat?: number; lng?: number };
        };
      }>;
    };

    if (
      json.status === "OVER_QUERY_LIMIT" ||
      json.status === "OVER_DAILY_LIMIT"
    ) {
      return { coords: null, quotaExceeded: true };
    }

    if (json.status === "OK" && json.results && json.results.length > 0) {
      const loc = json.results[0]?.geometry?.location;
      if (typeof loc?.lat === "number" && typeof loc?.lng === "number") {
        return {
          coords: { latitude: loc.lat, longitude: loc.lng },
          quotaExceeded: false,
        };
      }
    }

    return { coords: null, quotaExceeded: false };
  } catch {
    return { coords: null, quotaExceeded: false };
  }
}

/**
 * Server-side geocoding using Google Geocoding HTTP REST API (when configured).
 * Geocodes exact street address when available AND computes privacy-safe approximate coordinates.
 */
export async function geocodeNigerianListingServer(params: {
  addressLine?: string | null;
  area: string;
  lga: string;
  state: string;
}): Promise<GeocodeResult> {
  const apiKey =
    process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

  const fallbackApprox = getFallbackAreaCoordinates(params);

  if (!apiKey) {
    return {
      exact: null,
      approximate: fallbackApprox,
      quotaExceeded: false,
      source: "fallback",
    };
  }

  const areaQuery = `${params.area}, ${params.lga}, ${params.state}, Nigeria`;
  const exactQuery =
    params.addressLine && params.addressLine.trim().length >= 5
      ? `${params.addressLine}, ${areaQuery}`
      : null;

  if (exactQuery) {
    const exactRes = await fetchGoogleGeocode(exactQuery, apiKey);
    if (exactRes.quotaExceeded) {
      return {
        exact: null,
        approximate: fallbackApprox,
        quotaExceeded: true,
        source: "fallback",
      };
    }
    if (exactRes.coords) {
      return {
        exact: exactRes.coords,
        approximate: roundCoordinateForAreaPrivacy(
          exactRes.coords.latitude,
          exactRes.coords.longitude
        ),
        quotaExceeded: false,
        source: "google",
      };
    }
  }

  const areaRes = await fetchGoogleGeocode(areaQuery, apiKey);
  if (areaRes.coords) {
    return {
      exact: null,
      approximate: roundCoordinateForAreaPrivacy(
        areaRes.coords.latitude,
        areaRes.coords.longitude
      ),
      quotaExceeded: areaRes.quotaExceeded,
      source: "google",
    };
  }

  return {
    exact: null,
    approximate: fallbackApprox,
    quotaExceeded: areaRes.quotaExceeded,
    source: "fallback",
  };
}
