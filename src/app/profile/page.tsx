import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ProfileClient } from "@/components/profile-client";
import { getCurrentSession } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  if (!session.userId) {
    redirect("/auth/signin?next=/profile");
  }

  return (
    <AppShell role={session.profile?.role ?? null} isSignedIn>
      <ProfileClient profile={session.profile} email={session.email} />
    </AppShell>
  );
}
