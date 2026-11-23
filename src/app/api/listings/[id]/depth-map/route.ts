import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getDemoStore } from "@/lib/data/demo-store";
import { getCurrentSession } from "@/lib/data/queries";
import { getViewingModeFlags } from "@/lib/feature-flags";
import { depthMapRequestSchema } from "@/lib/schemas";
import { loadSafeListingPhotoBytes } from "@/lib/server-media";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isSupabaseConfigured,
  resolveDepthMapUrl,
  resolveListingPhotoUrl,
} from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DepthMap } from "@/types/database";

async function estimateDepthWebP(sourceBuffer: Buffer): Promise<Buffer> {
  const apiUrl = process.env.DEPTH_ESTIMATION_API_URL?.trim();
  const apiKey = process.env.DEPTH_ESTIMATION_API_KEY?.trim();

  if (!apiUrl || !apiKey) {
    throw new Error("Depth estimation is not configured.");
  }

  // Downscale input before sending to Hugging Face Inference to stay snappy & within limits
  const resizedInput = await sharp(sourceBuffer)
    .resize({ width: 768, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/octet-stream",
      Accept: "image/png, image/jpeg, image/webp, application/octet-stream",
    },
    body: new Uint8Array(resizedInput),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    throw new Error(`Depth inference returned HTTP ${res.status}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/") && contentType !== "application/octet-stream") {
    throw new Error("Unexpected response type from depth model.");
  }

  const rawDepthBuffer = Buffer.from(await res.arrayBuffer());
  return sharp(rawDepthBuffer)
    .grayscale()
    .resize({ width: 512, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
}

function normalizeComparablePhoto(raw: string): string {
  return resolveListingPhotoUrl(raw).trim();
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const flags = getViewingModeFlags();
  if (!flags.view3d) {
    return NextResponse.json(
      { error: "3D viewing mode is disabled." },
      { status: 404 }
    );
  }

  const { id: listingId } = await context.params;
  const session = await getCurrentSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = depthMapRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid photoPath." }, { status: 400 });
  }

  const isAdmin = Boolean(session.profile?.is_admin);
  const requestedPhoto = parsed.data.photoPath;
  const photoHash = crypto
    .createHash("sha256")
    .update(requestedPhoto)
    .digest("hex")
    .slice(0, 16);

  // Demo Preview mode
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const listing = store.listings[listingId];
    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    if (listing.landlord_id !== session.userId && !isAdmin) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const recordId = `${listingId}:${photoHash}`;
    const pendingRow: DepthMap = {
      id: store.depthMaps[recordId]?.id ?? crypto.randomUUID(),
      listing_id: listingId,
      photo_path: requestedPhoto,
      depth_path: "",
      status: "pending",
      created_at: new Date().toISOString(),
    };
    store.depthMaps[recordId] = pendingRow;

    try {
      const loaded = await loadSafeListingPhotoBytes(requestedPhoto);
      if (!loaded) throw new Error("Source photo unreadable.");
      const webpDepth = await estimateDepthWebP(loaded.buffer);
      const dataUrl = `data:image/webp;base64,${webpDepth.toString("base64")}`;
      const doneRow: DepthMap = {
        ...pendingRow,
        depth_path: dataUrl,
        status: "done",
      };
      store.depthMaps[recordId] = doneRow;
      return NextResponse.json({ depthMap: doneRow, fallback: false });
    } catch {
      const failedRow: DepthMap = {
        ...pendingRow,
        status: "failed",
      };
      store.depthMaps[recordId] = failedRow;
      return NextResponse.json({ depthMap: failedRow, fallback: true });
    }
  }

  // Live Supabase mode
  const admin = createSupabaseAdminClient();
  const userClient = await createSupabaseServerClient();
  const db = admin ?? userClient;
  if (!db) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
  }

  const [{ data: listingRow }, { data: roomRows }] = await Promise.all([
    db
      .from("listings")
      .select("id, landlord_id, cover_path")
      .eq("id", listingId)
      .maybeSingle(),
    db.from("rooms").select("photo_path").eq("listing_id", listingId),
  ]);

  if (!listingRow) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const typedListing = listingRow as {
    id: string;
    landlord_id: string;
    cover_path: string | null;
  };

  if (typedListing.landlord_id !== session.userId && !isAdmin) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // Allowlist check so only photos belonging to this listing can be processed
  const allowedNormalized = new Set<string>();
  if (typedListing.cover_path) {
    allowedNormalized.add(normalizeComparablePhoto(typedListing.cover_path));
  }
  for (const r of (roomRows ?? []) as Array<{ photo_path: string }>) {
    allowedNormalized.add(normalizeComparablePhoto(r.photo_path));
  }

  if (
    allowedNormalized.size > 0 &&
    !allowedNormalized.has(normalizeComparablePhoto(requestedPhoto)) &&
    !requestedPhoto.startsWith(`${typedListing.landlord_id}/${listingId}/`)
  ) {
    return NextResponse.json(
      { error: "Photo path does not belong to this listing." },
      { status: 400 }
    );
  }

  const storagePath = `${typedListing.landlord_id}/${listingId}/${photoHash}-depth.webp`;

  const { data: pendingInserted } = await db
    .from("listing_depth_maps")
    .upsert(
      {
        listing_id: listingId,
        photo_path: requestedPhoto,
        depth_path: storagePath,
        status: "pending",
      },
      { onConflict: "listing_id,photo_path" }
    )
    .select("*")
    .single();

  try {
    const loaded = await loadSafeListingPhotoBytes(requestedPhoto);
    if (!loaded) throw new Error("Source photo unreadable.");
    const webpDepth = await estimateDepthWebP(loaded.buffer);

    const storageClient = admin ?? userClient;
    if (!storageClient) throw new Error("Storage client unavailable.");

    const { error: uploadErr } = await storageClient.storage
      .from("depth-maps")
      .upload(storagePath, webpDepth, {
        contentType: "image/webp",
        upsert: true,
      });
    if (uploadErr) throw new Error(uploadErr.message);

    const { data: doneRow } = await db
      .from("listing_depth_maps")
      .update({
        depth_path: storagePath,
        status: "done",
      })
      .eq("listing_id", listingId)
      .eq("photo_path", requestedPhoto)
      .select("*")
      .single();

    const resultRow = (doneRow ?? pendingInserted) as DepthMap;
    return NextResponse.json({
      depthMap: {
        ...resultRow,
        photo_path: resolveListingPhotoUrl(resultRow.photo_path),
        depth_path: resolveDepthMapUrl(resultRow.depth_path) ?? resultRow.depth_path,
      },
      fallback: false,
    });
  } catch {
    const { data: failedRow } = await db
      .from("listing_depth_maps")
      .update({ status: "failed" })
      .eq("listing_id", listingId)
      .eq("photo_path", requestedPhoto)
      .select("*")
      .single();

    return NextResponse.json({
      depthMap: (failedRow ?? pendingInserted) as DepthMap,
      fallback: true,
    });
  }
}
