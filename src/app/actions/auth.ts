"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { DEMO_SESSION_COOKIE, getDemoStore } from "@/lib/data/demo-store";
import { signInSchema, signUpSchema } from "@/lib/schemas";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

export async function signInAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const existing = Object.values(store.users).find(
      (u) => u.email.toLowerCase() === parsed.data.email.toLowerCase()
    );
    const uid = existing?.profile.id ?? "11111111-1111-4111-8111-111111111103";
    const cookieStore = await cookies();
    cookieStore.set(DEMO_SESSION_COOKIE, uid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    const profile = store.users[uid]?.profile;
    revalidatePath("/");
    return {
      ok: true,
      data: { redirectTo: profile?.role ? "/explore" : "/onboarding/role" },
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase client unavailable" };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "Could not sign in" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  revalidatePath("/");
  return {
    ok: true,
    data: {
      redirectTo: (profile as { role?: string | null } | null)?.role
        ? "/explore"
        : "/onboarding/role",
    },
  };
}

export async function signUpAction(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  acceptedLegal: boolean;
}): Promise<ActionResult<{ redirectTo: string; needsEmailConfirmation?: boolean }>> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const existing = Object.values(store.users).find(
      (u) => u.email.toLowerCase() === parsed.data.email.toLowerCase()
    );
    const uid = existing?.profile.id ?? crypto.randomUUID();
    store.users[uid] = {
      email: parsed.data.email,
      profile: {
        id: uid,
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
        role: existing?.profile.role ?? null,
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
    };
    const cookieStore = await cookies();
    cookieStore.set(DEMO_SESSION_COOKIE, uid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    revalidatePath("/");
    return { ok: true, data: { redirectTo: "/onboarding/role" } };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase client unavailable" };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
      data: {
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
      },
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (data.user && data.session) {
    await supabase
      .from("profiles")
      .update({
        full_name: parsed.data.fullName,
        phone: parsed.data.phone,
      })
      .eq("id", data.user.id);

    revalidatePath("/");
    return { ok: true, data: { redirectTo: "/onboarding/role" } };
  }

  return {
    ok: true,
    data: {
      redirectTo: "/auth/signin",
      needsEmailConfirmation: true,
    },
  };
}

export async function signInDemoPresetAction(
  preset: "renter" | "landlord" | "new"
): Promise<ActionResult<{ redirectTo: string }>> {
  if (isSupabaseConfigured()) {
    return { ok: false, error: "Demo accounts are disabled when Supabase is active." };
  }
  const store = getDemoStore();
  let uid = "11111111-1111-4111-8111-111111111103";
  let redirectTo = "/explore";

  if (preset === "landlord") {
    uid = "11111111-1111-4111-8111-111111111101";
    redirectTo = "/landlord";
  } else if (preset === "new") {
    uid = crypto.randomUUID();
    store.users[uid] = {
      email: "new-user@demo.keyhaus.ng",
      profile: {
        id: uid,
        full_name: "New Keyhaus Member",
        phone: "+2348035551234",
        role: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
      },
    };
    redirectTo = "/onboarding/role";
  }

  const cookieStore = await cookies();
  cookieStore.set(DEMO_SESSION_COOKIE, uid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/");
  return { ok: true, data: { redirectTo } };
}

export async function signOutAction(): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    cookieStore.delete(DEMO_SESSION_COOKIE);
    revalidatePath("/");
    return { ok: true };
  }

  const supabase = await createSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }
  revalidatePath("/");
  return { ok: true };
}
