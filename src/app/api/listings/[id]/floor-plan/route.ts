import crypto from "crypto";
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getDemoStore } from "@/lib/data/demo-store";
import { getCurrentSession } from "@/lib/data/queries";
import { getViewingModeFlags } from "@/lib/feature-flags";
import { floorPlanGenerateSchema, floorPlanSchema } from "@/lib/schemas";
import { loadSafeListingPhotoBytes } from "@/lib/server-media";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FloorPlan, ListingFloorPlan, Room } from "@/types/database";

const FLOOR_PLAN_SYSTEM_PROMPT = [
  "You are an architectural layout illustrator generating an approximate 2D floor plan from Nigerian home photos and room metadata.",
  "Respond ONLY with valid JSON matching this exact TypeScript shape (no markdown fences, no commentary):",
  "{",
  '  "rooms": [{ "id": "string", "name": "string", "type": "living|bedroom|kitchen|bathroom|hallway|balcony|compound|other", "xPct": 0-95, "yPct": 0-95, "widthPct": 5-100, "heightPct": 5-100 }],',
  '  "openings": [{ "kind": "door|window", "roomId": "string (matches room id)", "wall": "top|right|bottom|left", "offsetPct": 5-95, "widthPct": 4-60 }],',
  '  "summary": "1-2 concise sentences describing the layout flow",',
  '  "isIllustrative": true',
  "}",
  "Rules:",
  "- Keep rooms neatly arranged inside a 100x100 grid (xPct + widthPct <= 100, yPct + heightPct <= 100).",
  "- Avoid overlapping rooms except shared internal walls.",
  "- Never claim exact dimensions or scale; this is an illustrative layout.",
].join("\n");

function extractJsonObject(rawText: string): string {
  const trimmed = rawText.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return candidate.slice(firstBrace, lastBrace + 1);
  }
  return candidate;
}

async function callClaudeForFloorPlan(params: {
  title: string;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  sizeSqm: number | null;
  rooms: Array<{ name: string; kind: string; photo_path: string }>;
}): Promise<{ plan: FloorPlan; model: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5";
  const client = new Anthropic({ apiKey });

  const imageBlocks: Array<{
    type: "image";
    source: {
      type: "base64";
      media_type: "image/webp" | "image/jpeg" | "image/png";
      data: string;
    };
  }> = [];

  for (const room of params.rooms.slice(0, 6)) {
    const loaded = await loadSafeListingPhotoBytes(room.photo_path);
    if (loaded) {
      imageBlocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: loaded.mimeType,
          data: loaded.buffer.toString("base64"),
        },
      });
    }
  }

  const roomListText = params.rooms
    .map((r, i) => `${i + 1}. ${r.name} (${r.kind})`)
    .join(", ");

  const userPrompt = [
    `Property: ${params.title}`,
    `Type: ${params.propertyType}`,
    `Bedrooms: ${params.bedrooms}, Bathrooms: ${params.bathrooms}`,
    params.sizeSqm ? `Approximate size: ${params.sizeSqm} sqm` : "Size: not specified",
    `Uploaded room photos: ${roomListText || "none"}`,
    "Generate a clean, connected illustrative 2D floor plan JSON now.",
  ].join("\n");

  const baseMessages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: [
        ...imageBlocks,
        { type: "text", text: userPrompt },
      ],
    },
  ];

  let lastError = "Invalid JSON from Claude.";
  let retryPrompt: string | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const messages: Anthropic.MessageParam[] =
      attempt === 0 || !retryPrompt
        ? baseMessages
        : [
            ...baseMessages,
            {
              role: "user",
              content: `Your previous JSON failed validation: ${retryPrompt}. Fix it and return ONLY valid JSON matching the schema.`,
            },
          ];

    const response = await client.messages.create({
      model,
      max_tokens: 1400,
      system: FLOOR_PLAN_SYSTEM_PROMPT,
      messages,
    });

    const textContent = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    try {
      const jsonString = extractJsonObject(textContent);
      const rawJson = JSON.parse(jsonString) as unknown;
      const validated = floorPlanSchema.safeParse(rawJson);
      if (validated.success) {
        return { plan: validated.data, model };
      }
      lastError = validated.error.issues.map((i) => i.message).join("; ");
      retryPrompt = lastError;
    } catch (err) {
      lastError = err instanceof Error ? err.message : "Could not parse JSON";
      retryPrompt = lastError;
    }
  }

  throw new Error(`Floor plan validation failed after retry: ${lastError}`);
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const flags = getViewingModeFlags();
  if (!flags.floorPlan2d) {
    return NextResponse.json(
      { error: "2D floor plan viewing mode is disabled." },
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
    body = {};
  }
  const parsedBody = floorPlanGenerateSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }

  const isAdmin = Boolean(session.profile?.is_admin);
  const regenerate = parsedBody.data.regenerate;

  if (regenerate && !isAdmin) {
    return NextResponse.json(
      { error: "Only administrators can regenerate an existing floor plan." },
      { status: 403 }
    );
  }

  // Demo Preview mode
  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const listing = store.listings[listingId];
    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    if (listing.landlord_id !== session.userId && !isAdmin) {
      return NextResponse.json(
        { error: "Only the listing landlord or an admin can generate a floor plan." },
        { status: 403 }
      );
    }

    const existing = store.floorPlans[listingId];
    if (existing && !regenerate) {
      return NextResponse.json({ floorPlan: existing, cached: true });
    }

    const listingRooms = Object.values(store.rooms)
      .filter((r) => r.listing_id === listingId)
      .sort((a, b) => a.sort_order - b.sort_order);

    try {
      const generated = await callClaudeForFloorPlan({
        title: listing.title,
        propertyType: listing.property_type,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        sizeSqm: listing.size_sqm ?? null,
        rooms: listingRooms,
      });

      const saved: ListingFloorPlan = {
        id: existing?.id ?? crypto.randomUUID(),
        listing_id: listingId,
        plan: generated.plan,
        model: generated.model,
        generated_at: new Date().toISOString(),
        is_illustrative: true,
      };
      store.floorPlans[listingId] = saved;
      return NextResponse.json({ floorPlan: saved, cached: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Floor plan generation failed.";
      const status = msg.includes("ANTHROPIC_API_KEY") ? 503 : 502;
      return NextResponse.json({ error: msg }, { status });
    }
  }

  // Live Supabase mode (service-role key used server-side only)
  const adminClient = createSupabaseAdminClient();
  const userClient = await createSupabaseServerClient();
  const db = adminClient ?? userClient;
  if (!db) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 500 });
  }

  const [{ data: listingRow }, { data: roomRows }, { data: existingPlan }] =
    await Promise.all([
      db
        .from("listings")
        .select("id, landlord_id, title, property_type, bedrooms, bathrooms, size_sqm")
        .eq("id", listingId)
        .maybeSingle(),
      db
        .from("rooms")
        .select("name, kind, photo_path, sort_order")
        .eq("listing_id", listingId)
        .order("sort_order", { ascending: true }),
      db
        .from("listing_floor_plans")
        .select("*")
        .eq("listing_id", listingId)
        .maybeSingle(),
    ]);

  if (!listingRow) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const typedListing = listingRow as {
    id: string;
    landlord_id: string;
    title: string;
    property_type: string;
    bedrooms: number;
    bathrooms: number;
    size_sqm: number | null;
  };

  if (typedListing.landlord_id !== session.userId && !isAdmin) {
    return NextResponse.json(
      { error: "Only the listing landlord or an admin can generate a floor plan." },
      { status: 403 }
    );
  }

  if (existingPlan && !regenerate) {
    return NextResponse.json({
      floorPlan: existingPlan as ListingFloorPlan,
      cached: true,
    });
  }

  if (!adminClient) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is required on the server to save floor plans." },
      { status: 503 }
    );
  }

  try {
    const rooms = (roomRows ?? []) as Array<Pick<Room, "name" | "kind" | "photo_path">>;
    const generated = await callClaudeForFloorPlan({
      title: typedListing.title,
      propertyType: typedListing.property_type,
      bedrooms: typedListing.bedrooms,
      bathrooms: typedListing.bathrooms,
      sizeSqm: typedListing.size_sqm,
      rooms,
    });

    const { data: upserted, error: upsertErr } = await adminClient
      .from("listing_floor_plans")
      .upsert(
        {
          listing_id: listingId,
          plan: generated.plan,
          model: generated.model,
          generated_at: new Date().toISOString(),
          is_illustrative: true,
        },
        { onConflict: "listing_id" }
      )
      .select("*")
      .single();

    if (upsertErr || !upserted) {
      return NextResponse.json(
        { error: upsertErr?.message ?? "Failed to save floor plan." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      floorPlan: upserted as ListingFloorPlan,
      cached: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Floor plan generation failed.";
    const status = msg.includes("ANTHROPIC_API_KEY") ? 503 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
