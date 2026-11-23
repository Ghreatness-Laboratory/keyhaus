"use server";

import { revalidatePath } from "next/cache";
import { getDemoStore } from "@/lib/data/demo-store";
import { getCurrentSession } from "@/lib/data/queries";
import { profileUpdateSchema, userRoleSchema } from "@/lib/schemas";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";
import type { ActionResult } from "./auth";

export async function setRoleAction(
  role: UserRole
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = userRoleSchema.safeParse(role);
  if (!parsed.success) {
    return { ok: false, error: "Choose renter or landlord." };
  }

  const session = await getCurrentSession();
  if (!session.userId) {
    return { ok: false, error: "Sign in required." };
  }

  const redirectTo = parsed.data === "landlord" ? "/landlord" : "/explore";

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const record = store.users[session.userId];
    if (!record) return { ok: false, error: "Profile not found." };
    record.profile.role = parsed.data;
    revalidatePath("/");
    return { ok: true, data: { redirectTo } };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable." };

  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data })
    .eq("id", session.userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  return { ok: true, data: { redirectTo } };
}

export async function updateProfileAction(input: {
  full_name: string;
  phone: string;
  role: UserRole;
}): Promise<ActionResult> {
  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check your profile details.",
    };
  }

  const session = await getCurrentSession();
  if (!session.userId) {
    return { ok: false, error: "Sign in required." };
  }

  if (!isSupabaseConfigured()) {
    const store = getDemoStore();
    const record = store.users[session.userId];
    if (!record) return { ok: false, error: "Profile not found." };
    record.profile.full_name = parsed.data.full_name;
    record.profile.phone = parsed.data.phone;
    record.profile.role = parsed.data.role;
    revalidatePath("/");
    return { ok: true };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { ok: false, error: "Supabase unavailable." };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      role: parsed.data.role,
    })
    .eq("id", session.userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  return { ok: true };
}
