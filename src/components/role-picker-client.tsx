"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search } from "lucide-react";
import { setRoleAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export function RolePickerClient({
  initialRole,
}: {
  initialRole: UserRole | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<UserRole>(initialRole ?? "renter");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await setRoleAction(selected);
      if (!res.ok) {
        setErrorMsg(res.error ?? "Could not save role.");
        return;
      }
      router.push(res.data?.redirectTo ?? "/explore");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-6 pt-4">
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-2xl font-bold text-[#17211F] text-balance">
          How will you use Keyhaus?
        </h1>
        <p className="text-sm text-[#5B6663]">
          You can switch between renter and landlord anytime in your Profile.
        </p>
      </div>

      <div className="space-y-3" role="radiogroup" aria-label="Account role">
        <button
          type="button"
          role="radio"
          aria-checked={selected === "renter"}
          onClick={() => setSelected("renter")}
          className={cn(
            "flex w-full items-start gap-4 rounded-[22px] border-[1.5px] p-5 text-left transition-colors cursor-pointer",
            selected === "renter"
              ? "border-[#0E6B5B] bg-[#DDEEE9]/60"
              : "border-[#E2DFD6] bg-white hover:border-[#0E6B5B]/40"
          )}
        >
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#0E6B5B] text-white">
            <Search className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <p className="font-heading text-base font-bold text-[#17211F]">
              I&apos;m looking for a place
            </p>
            <p className="mt-1 text-sm text-[#5B6663]">
              Browse homes, take room-by-room photo tours, check honest neighborhood
              reports, and book viewings.
            </p>
          </div>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={selected === "landlord"}
          onClick={() => setSelected("landlord")}
          className={cn(
            "flex w-full items-start gap-4 rounded-[22px] border-[1.5px] p-5 text-left transition-colors cursor-pointer",
            selected === "landlord"
              ? "border-[#0E6B5B] bg-[#DDEEE9]/60"
              : "border-[#E2DFD6] bg-white hover:border-[#0E6B5B]/40"
          )}
        >
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#17211F] text-[#E3A93B]">
            <Building2 className="h-5 w-5" strokeWidth={2} />
          </span>
          <div>
            <p className="font-heading text-base font-bold text-[#17211F]">
              I&apos;m a landlord
            </p>
            <p className="mt-1 text-sm text-[#5B6663]">
              List rental properties, add room-by-room walk-throughs, and respond to
              viewing requests.
            </p>
          </div>
        </button>
      </div>

      {errorMsg && (
        <p role="alert" className="text-center text-sm font-medium text-[#B3261E]">
          {errorMsg}
        </p>
      )}

      <Button size="lg" onClick={handleSave} disabled={isPending} className="w-full">
        {isPending ? "Saving..." : "Continue"}
      </Button>
    </div>
  );
}
