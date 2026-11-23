import { NextRequest, NextResponse } from "next/server";
import { getDemoStore } from "@/lib/data/demo-store";
import { getCurrentSession } from "@/lib/data/queries";
import { geocodeNigerianListingServer } from "@/lib/geocoding";
import { geocodeRequestSchema } from "@/lib/schemas";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await context.params;
  const session = await getCurrentSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = geocodeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const isAdmin = Boolean(session.profile?.is_admin);

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const listing = store.listings[listingId];
    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    if (listing.landlord_id !== session.userId && !isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (
      !parsed.data.force &&
      typeof listing.approx_latitude === "number" &&
      typeof listing.approx_longitude === "number"
    ) {
      return NextResponse.json({
        approx_latitude: listing.approx_latitude,
        approx_longitude: listing.approx_longitude,
        quotaExceeded: false,
      });
    }

    const result = await geocodeNigerianListingServer({
      addressLine: listing.address_line,
      area: listing.area,
      lga: listing.lga,
      state: listing.state,
    });

    listing.approx_latitude = result.approximate.latitude;
    listing.approx_longitude = result.approximate.longitude;
    if (result.exact) {
      listing.latitude = result.exact.latitude;
      listing.longitude = result.exact.longitude;
    }

    return NextResponse.json(
      {
        approx_latitude: listing.approx_latitude,
        approx_longitude: listing.approx_longitude,
        quotaExceeded: result.quotaExceeded,
      },
      { status: result.quotaExceeded ? 429 : 200 }
    );
  }

  const admin = createSupabaseAdminClient();
  const userClient = await createSupabaseServerClient();
  const db = admin ?? userClient;
  if (!db) {
    return NextResponse.json({ error: "Supabase unavailable." }, { status: 500 });
  }

  const { data: row, error: fetchErr } = await db
    .from("listings")
    .select(
      "id, landlord_id, area, lga, state, address_line, approx_latitude, approx_longitude, latitude, longitude"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const typed = row as {
    id: string;
    landlord_id: string;
    area: string;
    lga: string;
    state: string;
    address_line?: string;
    approx_latitude: number | null;
    approx_longitude: number | null;
    latitude?: number | null;
    longitude?: number | null;
  };

  if (typed.landlord_id !== session.userId && !isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (
    !parsed.data.force &&
    typeof typed.approx_latitude === "number" &&
    typeof typed.approx_longitude === "number"
  ) {
    return NextResponse.json({
      approx_latitude: typed.approx_latitude,
      approx_longitude: typed.approx_longitude,
      quotaExceeded: false,
    });
  }

  const result = await geocodeNigerianListingServer({
    addressLine: typed.address_line ?? null,
    area: typed.area,
    lga: typed.lga,
    state: typed.state,
  });

  await db
    .from("listings")
    .update({
      approx_latitude: result.approximate.latitude,
      approx_longitude: result.approximate.longitude,
      ...(result.exact
        ? {
            latitude: result.exact.latitude,
            longitude: result.exact.longitude,
          }
        : {}),
    })
    .eq("id", listingId);

  return NextResponse.json(
    {
      approx_latitude: result.approximate.latitude,
      approx_longitude: result.approximate.longitude,
      quotaExceeded: result.quotaExceeded,
    },
    { status: result.quotaExceeded ? 429 : 200 }
  );
}
