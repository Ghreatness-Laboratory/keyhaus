import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RolePickerClient } from "@/components/role-picker-client";
import { getCurrentSession } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function OnboardingRolePage() {
  const session = await getCurrentSession();
  if (!session.userId) {
    redirect("/auth/signin?next=/onboarding/role");
  }

  return (
    <AppShell
      role={session.profile?.role ?? null}
      isSignedIn
      hideBottomNav
    >
      <RolePickerClient initialRole={session.profile?.role ?? null} />
    </AppShell>
  );
}
