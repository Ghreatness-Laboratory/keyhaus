export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && url.trim().length > 0 && anonKey && anonKey.trim().length > 0);
}

export function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return { url, anonKey };
}

export function resolveListingPhotoUrl(photoPath: string | null | undefined): string {
  if (!photoPath) {
    return "/images/demo/living-lagos-thumb.webp";
  }
  if (photoPath.startsWith("/") || photoPath.startsWith("http://") || photoPath.startsWith("https://") || photoPath.startsWith("data:")) {
    return photoPath;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return "/images/demo/living-lagos-thumb.webp";
  }
  return `${url.replace(/\/$/, "")}/storage/v1/object/public/listing-photos/${photoPath}`;
}
