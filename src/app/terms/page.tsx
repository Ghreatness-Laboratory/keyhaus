import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const session = await getCurrentSession();

  return (
    <AppShell role={session.profile?.role ?? null} isSignedIn={Boolean(session.userId)}>
      <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-6 space-y-4">
        <div className="rounded-[14px] border-[1.5px] border-[#E3A93B] bg-[#FBF4E4] p-3 text-xs font-semibold text-[#6E4D07]">
          DRAFT FOR LEGAL REVIEW — To be reviewed and finalized by a qualified Nigerian
          lawyer before public launch.
        </div>

        <h1 className="font-heading text-2xl font-bold text-[#17211F]">Terms of Use</h1>
        <p className="text-sm leading-relaxed text-[#5B6663]">
          Keyhaus is an online rental discovery platform connecting prospective tenants
          and landlords in Nigeria. Keyhaus does not act as an estate agent, broker,
          escrow service, or payment processor.
        </p>

        <section className="space-y-2 text-sm text-[#17211F]">
          <h2 className="font-heading text-base font-bold">1. Accuracy of listings</h2>
          <p>
            Landlords must provide truthful room photos, rent figures in Nigerian Naira,
            and accurate neighborhood reports. Inaccurate listings may be removed.
          </p>
        </section>

        <section className="space-y-2 text-sm text-[#17211F]">
          <h2 className="font-heading text-base font-bold">2. No in-app payments</h2>
          <p>
            Keyhaus takes no payments in version 1. All rent, caution, agency, and legal
            agreements occur directly between landlord and tenant after physical
            inspection.
          </p>
        </section>

        <Button asChild variant="outline">
          <Link href="/explore">Back to Explore</Link>
        </Button>
      </div>
    </AppShell>
  );
}
