import Link from "next/link";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getCurrentSession } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

const SAFETY_TIPS = [
  "Never pay rent, agency fees, inspection fees, or caution deposits before visiting the home in person and meeting the landlord or authorised caretaker.",
  "Keyhaus does not process payments, hold deposits, or ask for bank transfers.",
  "Verify who owns or manages the compound before paying. Ask to inspect utility bills or meet neighbours inside the compound.",
  "Visit during daylight hours and bring a friend or family member when inspecting a property for the first time.",
  "Get a written tenancy agreement signed by both parties and keep bank transfer receipts with clear narration.",
];

export default async function SafetyPage() {
  const session = await getCurrentSession();

  return (
    <AppShell role={session.profile?.role ?? null} isSignedIn={Boolean(session.userId)}>
      <div className="space-y-5">
        <div className="rounded-[22px] border-[1.5px] border-[#E3A93B] bg-[#FBF4E4] p-5 space-y-2">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-6 w-6 text-[#9B6B0A]" strokeWidth={2} />
            <h1 className="font-heading text-xl font-bold text-[#17211F]">
              Rental safety in Nigeria
            </h1>
          </div>
          <p className="text-sm text-[#17211F]">
            Keyhaus helps you inspect rooms and neighborhoods honestly before leaving home,
            but physical verification protects your money.
          </p>
        </div>

        <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-5 space-y-3">
          <h2 className="font-heading text-base font-bold text-[#17211F]">
            Five rules before you pay a naira
          </h2>
          <ul className="space-y-3">
            {SAFETY_TIPS.map((tip) => (
              <li key={tip} className="flex items-start gap-2.5 text-sm text-[#17211F]">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#0E6B5B]"
                  strokeWidth={2}
                />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        <Button asChild variant="outline">
          <Link href="/explore">Back to Explore</Link>
        </Button>
      </div>
    </AppShell>
  );
}
