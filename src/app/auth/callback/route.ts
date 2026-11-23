import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .maybeSingle();

        const hasRole = Boolean((profile as { role?: string | null } | null)?.role);
        const target = hasRole ? (next ?? "/explore") : "/onboarding/role";
        return NextResponse.redirect(`${origin}${target}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/signin?error=oauth`);
}
