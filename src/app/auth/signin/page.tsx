import { AppShell } from "@/components/app-shell";
import { AuthFormClient } from "@/components/auth-form-client";
import { getCurrentSession } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [session, sp] = await Promise.all([getCurrentSession(), searchParams]);

  return (
    <AppShell
      role={session.profile?.role ?? null}
      isSignedIn={Boolean(session.userId)}
      hideBottomNav
    >
      <AuthFormClient
        mode="signin"
        isDemoMode={session.isDemoMode}
        nextPath={sp.next}
      />
    </AppShell>
  );
}
