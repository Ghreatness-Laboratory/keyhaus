"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { getDemoStore } from "@/lib/data/demo-store";
import { getCurrentSession } from "@/lib/data/queries";
import { reportListingSchema, viewingRequestSchema } from "@/lib/schemas";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

export async function toggleSavedListingAction(
  listingId: string
): Promise<ActionResult<{ saved: boolean }>> {
  const session = await getCurrentSession();
  if (!session.userId) {
    return { ok: false, error: "Sign in to save places." };
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const list = store.saved[session.userId] ?? [];
    const exists = list.includes(listingId);
    store.saved[session.userId] = exists
      ? list.filter((id) => id !== listingId)
      : [listingId, ...list];
    revalidatePath("/explore");
    revalidatePath("/saved");
    revalidatePath(`/listing/${listingId}`);
    return { ok: true, data: { saved: !exists } };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable." };

  const { data: existing } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", session.userId)
    .eq("listing_id", listingId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("saved_listings")
      .delete()
      .eq("user_id", session.userId)
      .eq("listing_id", listingId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/explore");
    revalidatePath("/saved");
    revalidatePath(`/listing/${listingId}`);
    return { ok: true, data: { saved: false } };
  }

  const { error } = await supabase.from("saved_listings").insert({
    user_id: session.userId,
    listing_id: listingId,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/explore");
  revalidatePath("/saved");
  revalidatePath(`/listing/${listingId}`);
  return { ok: true, data: { saved: true } };
}

export async function requestViewingAction(input: {
  listing_id: string;
  preferred_date: string;
  time_window: string;
  note?: string;
}): Promise<ActionResult> {
  const parsed = viewingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your viewing request details.",
    };
  }

  const session = await getCurrentSession();
  if (!session.userId) {
    return { ok: false, error: "Sign in to request a viewing." };
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const listing = store.listings[parsed.data.listing_id];
    if (!listing || listing.status !== "published") {
      return { ok: false, error: "Listing not available." };
    }
    if (listing.landlord_id === session.userId) {
      return { ok: false, error: "You cannot request a viewing on your own listing." };
    }
    const alreadyPending = Object.values(store.viewings).some(
      (v) =>
        v.listing_id === parsed.data.listing_id &&
        v.renter_id === session.userId &&
        v.status === "pending"
    );
    if (alreadyPending) {
      return {
        ok: false,
        error: "You already have a pending viewing request for this home.",
      };
    }

    const id = crypto.randomUUID();
    store.viewings[id] = {
      id,
      listing_id: parsed.data.listing_id,
      renter_id: session.userId,
      preferred_date: parsed.data.preferred_date,
      time_window: parsed.data.time_window,
      note: parsed.data.note ?? null,
      status: "pending",
      created_at: new Date().toISOString(),
    };
    revalidatePath(`/listing/${parsed.data.listing_id}`);
    revalidatePath("/viewings");
    revalidatePath("/landlord/requests");
    return { ok: true };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable." };

  const { error } = await supabase.from("viewing_requests").insert({
    listing_id: parsed.data.listing_id,
    renter_id: session.userId,
    preferred_date: parsed.data.preferred_date,
    time_window: parsed.data.time_window,
    note: parsed.data.note ?? null,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "You already have a pending viewing request for this home.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/listing/${parsed.data.listing_id}`);
  revalidatePath("/viewings");
  revalidatePath("/landlord/requests");
  return { ok: true };
}

export async function respondViewingRequestAction(
  requestId: string,
  status: "accepted" | "declined"
): Promise<ActionResult> {
  const session = await getCurrentSession();
  if (!session.userId) return { ok: false, error: "Sign in required." };

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const req = store.viewings[requestId];
    if (!req) return { ok: false, error: "Request not found." };
    const listing = store.listings[req.listing_id];
    if (!listing || listing.landlord_id !== session.userId) {
      return { ok: false, error: "Unauthorized." };
    }
    req.status = status;
    revalidatePath("/landlord/requests");
    revalidatePath("/viewings");
    revalidatePath(`/listing/${req.listing_id}`);
    return { ok: true };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable." };

  const { error } = await supabase
    .from("viewing_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/landlord/requests");
  revalidatePath("/viewings");
  return { ok: true };
}

export async function reportListingAction(input: {
  listing_id: string;
  reason: string;
}): Promise<ActionResult> {
  const parsed = reportListingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Provide a clear reason.",
    };
  }

  const session = await getCurrentSession();
  if (!session.userId) {
    return { ok: false, error: "Sign in to report inaccurate information." };
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    store.reports.push({
      id: crypto.randomUUID(),
      listing_id: parsed.data.listing_id,
      reporter_id: session.userId,
      reason: parsed.data.reason,
      created_at: new Date().toISOString(),
    });
    return { ok: true };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable." };

  const { error } = await supabase.from("reports").insert({
    listing_id: parsed.data.listing_id,
    reporter_id: session.userId,
    reason: parsed.data.reason,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
