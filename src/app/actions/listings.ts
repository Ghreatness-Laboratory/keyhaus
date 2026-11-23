"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import {
  MAX_PUBLISHED_LISTINGS_PER_LANDLORD,
  MAX_ROOMS_PER_LISTING,
} from "@/lib/constants";
import { getDemoStore } from "@/lib/data/demo-store";
import { getCurrentSession } from "@/lib/data/queries";
import { isValidNigerianPhone } from "@/lib/nigeria";
import {
  listingDetailsSchema,
  listingEnvironmentSchema,
  roomLinkSchema,
  roomSchema,
} from "@/lib/schemas";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ListingStatus } from "@/types/database";
import type { ActionResult } from "./auth";

export async function saveListingDetailsAction(
  listingId: string | null,
  input: unknown
): Promise<ActionResult<{ listingId: string }>> {
  const parsed = listingDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check listing details.",
    };
  }

  const session = await getCurrentSession();
  if (!session.userId) return { ok: false, error: "Sign in required." };
  if (session.profile?.role !== "landlord") {
    return { ok: false, error: "Switch to a landlord account to list homes." };
  }

  const values = parsed.data;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const id = listingId ?? crypto.randomUUID();
    const existing = store.listings[id];
    if (existing && existing.landlord_id !== session.userId) {
      return { ok: false, error: "You do not own this listing." };
    }
    store.listings[id] = {
      id,
      landlord_id: session.userId,
      title: values.title,
      description: values.description,
      property_type: values.property_type,
      rent_amount: values.rent_amount,
      rent_period: values.rent_period,
      agency_fee: values.agency_fee ?? null,
      legal_fee: values.legal_fee ?? null,
      caution_fee: values.caution_fee ?? null,
      bedrooms: values.bedrooms,
      bathrooms: values.bathrooms,
      furnished: values.furnished,
      amenities: values.amenities,
      state: values.state,
      lga: values.lga,
      area: values.area,
      address_line: values.address_line,
      cover_path: existing?.cover_path ?? null,
      cover_thumb_path: existing?.cover_thumb_path ?? null,
      status: existing?.status ?? "draft",
      created_at: existing?.created_at ?? new Date().toISOString(),
      published_at: existing?.published_at ?? null,
    };
    revalidatePath("/landlord");
    return { ok: true, data: { listingId: id } };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable." };

  if (listingId) {
    const { error } = await supabase
      .from("listings")
      .update({
        ...values,
        agency_fee: values.agency_fee ?? null,
        legal_fee: values.legal_fee ?? null,
        caution_fee: values.caution_fee ?? null,
      })
      .eq("id", listingId)
      .eq("landlord_id", session.userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/landlord");
    return { ok: true, data: { listingId } };
  }

  const { data, error } = await supabase
    .from("listings")
    .insert({
      landlord_id: session.userId,
      ...values,
      agency_fee: values.agency_fee ?? null,
      legal_fee: values.legal_fee ?? null,
      caution_fee: values.caution_fee ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create draft." };
  }
  revalidatePath("/landlord");
  return { ok: true, data: { listingId: (data as { id: string }).id } };
}

export async function saveListingEnvironmentAction(
  listingId: string,
  input: unknown
): Promise<ActionResult> {
  const parsed = listingEnvironmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check neighborhood answers.",
    };
  }

  const session = await getCurrentSession();
  if (!session.userId) return { ok: false, error: "Sign in required." };

  const values = parsed.data;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const listing = store.listings[listingId];
    if (!listing || listing.landlord_id !== session.userId) {
      return { ok: false, error: "Listing not found or unauthorized." };
    }
    store.environments[listingId] = {
      listing_id: listingId,
      power_grid: values.power_grid,
      grid_hours_per_day: values.grid_hours_per_day ?? null,
      power_backup: values.power_backup,
      road_surface: values.road_surface,
      road_condition: values.road_condition,
      flooding: values.flooding,
      waste: values.waste,
      water: values.water,
      security: values.security,
      network: values.network,
      note: values.note ?? null,
    };
    revalidatePath("/landlord");
    revalidatePath(`/listing/${listingId}`);
    return { ok: true };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable." };

  const { error } = await supabase.from("listing_environment").upsert(
    {
      listing_id: listingId,
      ...values,
      grid_hours_per_day: values.grid_hours_per_day ?? null,
      note: values.note ?? null,
    },
    { onConflict: "listing_id" }
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/landlord");
  revalidatePath(`/listing/${listingId}`);
  return { ok: true };
}

export interface RoomInputPayload {
  id: string;
  name: string;
  kind: "flat" | "panorama";
  photo_path: string;
  width: number;
  height: number;
  sort_order: number;
}

export interface RoomLinkInputPayload {
  id: string;
  from_room_id: string;
  to_room_id: string;
  yaw: number | null;
  pitch: number | null;
  x_pct: number | null;
  y_pct: number | null;
  label: string;
}

export async function saveListingRoomsAction(
  listingId: string,
  rooms: RoomInputPayload[],
  roomLinks: RoomLinkInputPayload[],
  coverThumbPath: string | null
): Promise<ActionResult> {
  if (rooms.length > MAX_ROOMS_PER_LISTING) {
    return {
      ok: false,
      error: `Maximum ${MAX_ROOMS_PER_LISTING} rooms allowed per listing.`,
    };
  }

  for (const room of rooms) {
    const check = roomSchema.safeParse(room);
    if (!check.success) {
      return { ok: false, error: check.error.issues[0]?.message ?? "Invalid room" };
    }
  }
  for (const link of roomLinks) {
    const check = roomLinkSchema.safeParse(link);
    if (!check.success) {
      return { ok: false, error: check.error.issues[0]?.message ?? "Invalid hotspot" };
    }
  }

  const session = await getCurrentSession();
  if (!session.userId) return { ok: false, error: "Sign in required." };

  const sortedRooms = [...rooms].sort((a, b) => a.sort_order - b.sort_order);
  const coverPath = sortedRooms[0]?.photo_path ?? null;
  const thumbPath = coverThumbPath ?? coverPath;

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const listing = store.listings[listingId];
    if (!listing || listing.landlord_id !== session.userId) {
      return { ok: false, error: "Listing not found or unauthorized." };
    }

    const oldRoomIds = new Set(
      Object.values(store.rooms)
        .filter((r) => r.listing_id === listingId)
        .map((r) => r.id)
    );
    for (const rId of oldRoomIds) {
      delete store.rooms[rId];
    }
    for (const [linkId, link] of Object.entries(store.roomLinks)) {
      if (oldRoomIds.has(link.from_room_id) || oldRoomIds.has(link.to_room_id)) {
        delete store.roomLinks[linkId];
      }
    }

    for (const r of sortedRooms) {
      store.rooms[r.id] = {
        id: r.id,
        listing_id: listingId,
        name: r.name,
        kind: r.kind,
        photo_path: r.photo_path,
        width: r.width,
        height: r.height,
        sort_order: r.sort_order,
      };
    }

    const validRoomIds = new Set(sortedRooms.map((r) => r.id));
    for (const link of roomLinks) {
      if (
        validRoomIds.has(link.from_room_id) &&
        validRoomIds.has(link.to_room_id) &&
        link.from_room_id !== link.to_room_id
      ) {
        store.roomLinks[link.id] = { ...link };
      }
    }

    listing.cover_path = coverPath;
    listing.cover_thumb_path = thumbPath;

    revalidatePath("/landlord");
    revalidatePath(`/listing/${listingId}`);
    return { ok: true };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable." };

  const { data: owned } = await supabase
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .eq("landlord_id", session.userId)
    .maybeSingle();

  if (!owned) return { ok: false, error: "Listing not found or unauthorized." };

  await supabase.from("rooms").delete().eq("listing_id", listingId);

  if (sortedRooms.length > 0) {
    const { error: insertRoomsErr } = await supabase.from("rooms").insert(
      sortedRooms.map((r, idx) => ({
        id: r.id,
        listing_id: listingId,
        name: r.name,
        kind: r.kind,
        photo_path: r.photo_path,
        width: r.width,
        height: r.height,
        sort_order: idx,
      }))
    );
    if (insertRoomsErr) return { ok: false, error: insertRoomsErr.message };
  }

  const validRoomIds = new Set(sortedRooms.map((r) => r.id));
  const validLinks = roomLinks.filter(
    (link) =>
      validRoomIds.has(link.from_room_id) &&
      validRoomIds.has(link.to_room_id) &&
      link.from_room_id !== link.to_room_id
  );

  if (validLinks.length > 0) {
    const { error: linksErr } = await supabase.from("room_links").insert(
      validLinks.map((l) => ({
        from_room_id: l.from_room_id,
        to_room_id: l.to_room_id,
        yaw: l.yaw,
        pitch: l.pitch,
        x_pct: l.x_pct,
        y_pct: l.y_pct,
        label: l.label,
      }))
    );
    if (linksErr) return { ok: false, error: linksErr.message };
  }

  await supabase
    .from("listings")
    .update({ cover_path: coverPath, cover_thumb_path: thumbPath })
    .eq("id", listingId)
    .eq("landlord_id", session.userId);

  revalidatePath("/landlord");
  revalidatePath(`/listing/${listingId}`);
  return { ok: true };
}

export async function publishListingAction(listingId: string): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session.userId) return { ok: false, error: "Sign in required." };

  if (
    !session.profile?.full_name ||
    !session.profile.phone ||
    !isValidNigerianPhone(session.profile.phone)
  ) {
    return {
      ok: false,
      error:
        "Add your full name and a valid Nigerian mobile number in Profile before publishing.",
    };
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const listing = store.listings[listingId];
    if (!listing || listing.landlord_id !== session.userId) {
      return { ok: false, error: "Listing not found." };
    }
    const env = store.environments[listingId];
    if (!env) {
      return {
        ok: false,
        error: "Complete the Neighborhood report before publishing.",
      };
    }
    const rooms = Object.values(store.rooms).filter((r) => r.listing_id === listingId);
    if (rooms.length === 0) {
      return { ok: false, error: "Add at least one room photo before publishing." };
    }
    const publishedCount = Object.values(store.listings).filter(
      (l) =>
        l.landlord_id === session.userId &&
        l.status === "published" &&
        l.id !== listingId
    ).length;
    if (publishedCount >= MAX_PUBLISHED_LISTINGS_PER_LANDLORD) {
      return {
        ok: false,
        error: `Maximum ${MAX_PUBLISHED_LISTINGS_PER_LANDLORD} published listings allowed.`,
      };
    }

    listing.status = "published";
    listing.published_at = listing.published_at ?? new Date().toISOString();
    revalidatePath("/explore");
    revalidatePath("/landlord");
    revalidatePath(`/listing/${listingId}`);
    return { ok: true };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable." };

  const { error } = await supabase
    .from("listings")
    .update({ status: "published" })
    .eq("id", listingId)
    .eq("landlord_id", session.userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/explore");
  revalidatePath("/landlord");
  revalidatePath(`/listing/${listingId}`);
  return { ok: true };
}

export async function updateListingStatusAction(
  listingId: string,
  status: ListingStatus
): Promise<ActionResult> {
  if (status === "published") {
    return publishListingAction(listingId);
  }

  const session = await getCurrentSession();
  if (!session.userId) return { ok: false, error: "Sign in required." };

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const listing = store.listings[listingId];
    if (!listing || listing.landlord_id !== session.userId) {
      return { ok: false, error: "Listing not found." };
    }
    listing.status = status;
    revalidatePath("/explore");
    revalidatePath("/landlord");
    revalidatePath(`/listing/${listingId}`);
    return { ok: true };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable." };

  const { error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId)
    .eq("landlord_id", session.userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/explore");
  revalidatePath("/landlord");
  revalidatePath(`/listing/${listingId}`);
  return { ok: true };
}

export async function deleteListingAction(listingId: string): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session.userId) return { ok: false, error: "Sign in required." };

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const listing = store.listings[listingId];
    if (!listing || listing.landlord_id !== session.userId) {
      return { ok: false, error: "Listing not found." };
    }
    delete store.listings[listingId];
    delete store.environments[listingId];
    for (const [roomId, room] of Object.entries(store.rooms)) {
      if (room.listing_id === listingId) {
        delete store.rooms[roomId];
      }
    }
    revalidatePath("/explore");
    revalidatePath("/landlord");
    return { ok: true };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable." };

  const { error } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("landlord_id", session.userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/explore");
  revalidatePath("/landlord");
  return { ok: true };
}
