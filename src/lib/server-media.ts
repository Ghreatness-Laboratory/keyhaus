import fs from "fs/promises";
import path from "path";
import { getSupabaseConfig, resolveListingPhotoUrl } from "@/lib/supabase/config";

export type SupportedImageMime = "image/webp" | "image/jpeg" | "image/png";

function detectMimeFromBytes(buf: Buffer, fallbackPath: string): SupportedImageMime {
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (fallbackPath.toLowerCase().endsWith(".png")) return "image/png";
  if (fallbackPath.toLowerCase().endsWith(".jpg") || fallbackPath.toLowerCase().endsWith(".jpeg")) {
    return "image/jpeg";
  }
  return "image/webp";
}

/**
 * Safely loads a listing photo either from local `public/` assets or from the
 * configured Supabase Storage public URL. Prevents SSRF against arbitrary external URLs.
 */
export async function loadSafeListingPhotoBytes(
  rawPhotoPath: string
): Promise<{ buffer: Buffer; mimeType: SupportedImageMime } | null> {
  if (!rawPhotoPath) return null;

  // 1. Data URL (used in local Demo Preview when uploading new photos)
  if (rawPhotoPath.startsWith("data:image/")) {
    const match = /^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(
      rawPhotoPath
    );
    if (!match) return null;
    const buffer = Buffer.from(match[2], "base64");
    return { buffer, mimeType: match[1] as SupportedImageMime };
  }

  // 2. Local public asset path (e.g. /images/demo/...)
  if (rawPhotoPath.startsWith("/")) {
    const publicDir = path.resolve(process.cwd(), "public");
    const safeRelative = path.normalize(rawPhotoPath).replace(/^(\.\.(\/|\\|$))+/, "");
    const resolved = path.resolve(publicDir, safeRelative.replace(/^\/+/, ""));
    if (!resolved.startsWith(publicDir + path.sep)) {
      return null;
    }
    try {
      const buffer = await fs.readFile(resolved);
      return { buffer, mimeType: detectMimeFromBytes(buffer, resolved) };
    } catch {
      return null;
    }
  }

  // 3. Relative Supabase storage path OR exact Supabase Storage URL
  const { url: supabaseUrl } = getSupabaseConfig();
  if (!supabaseUrl) return null;

  const expectedOrigin = new URL(supabaseUrl).origin;
  const resolvedUrl = resolveListingPhotoUrl(rawPhotoPath);

  let parsed: URL;
  try {
    parsed = new URL(resolvedUrl);
  } catch {
    return null;
  }

  if (parsed.origin !== expectedOrigin || parsed.protocol !== "https:") {
    return null;
  }
  if (!parsed.pathname.startsWith("/storage/v1/object/public/listing-photos/")) {
    return null;
  }

  try {
    const res = await fetch(parsed.toString(), {
      method: "GET",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > 5 * 1024 * 1024) return null;
    const buffer = Buffer.from(arrayBuf);
    return { buffer, mimeType: detectMimeFromBytes(buffer, parsed.pathname) };
  } catch {
    return null;
  }
}
