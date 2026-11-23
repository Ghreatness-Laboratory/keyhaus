import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const session = await getCurrentSession();

  return (
    <AppShell role={session.profile?.role ?? null} isSignedIn={Boolean(session.userId)}>
      <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-6 space-y-4">
        <div className="rounded-[14px] border-[1.5px] border-[#E3A93B] bg-[#FBF4E4] p-3 text-xs font-semibold text-[#6E4D07]">
          DRAFT FOR LEGAL REVIEW — To be reviewed for compliance with the Nigeria Data
          Protection Act (NDPA) by a Nigerian lawyer before launch.
        </div>

        <h1 className="font-heading text-2xl font-bold text-[#17211F]">
          Privacy Policy
        </h1>
        <p className="text-sm leading-relaxed text-[#5B6663]">
          Keyhaus collects only your full name, email address, and Nigerian mobile phone
          number so renters and landlords can arrange property viewings.
        </p>

        <section className="space-y-2 text-sm text-[#17211F]">
          <h2 className="font-heading text-base font-bold">1. Phone &amp; address privacy</h2>
          <p>
            Landlord phone numbers are never shown to signed-out visitors. Exact street
            addresses are kept private until a landlord accepts a viewing request.
          </p>
        </section>

        <section className="space-y-2 text-sm text-[#17211F]">
          <h2 className="font-heading text-base font-bold">2. Shared devices</h2>
          <p>
            Signing out clears cached personal data on your device. You may request
            account deletion at any time.
          </p>
        </section>

        <Button asChild variant="outline">
          <Link href="/explore">Back to Explore</Link>
        </Button>
      </div>
    </AppShell>
  );
}
