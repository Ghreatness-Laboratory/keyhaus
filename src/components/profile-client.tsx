"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, LogOut, ShieldCheck, UserCheck } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { updateProfileAction } from "@/app/actions/profile";
import {
  clearKeyhausPrivateCaches,
  usePwaInstallPrompt,
} from "@/components/pwa-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Profile, UserRole } from "@/types/database";

export function ProfileClient({
  profile,
  email,
}: {
  profile: Profile | null;
  email: string | null;
}) {
  const router = useRouter();
  const { canPrompt, isStandalone, triggerInstall } = usePwaInstallPrompt();

  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [role, setRole] = useState<UserRole>(profile?.role ?? "renter");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const res = await updateProfileAction({
        full_name: fullName,
        phone,
        role,
      });
      if (!res.ok) {
        setFeedback({ ok: false, text: res.error ?? "Could not save profile." });
        return;
      }
      setFeedback({ ok: true, text: "Profile updated." });
      router.refresh();
    });
  };

  const handleSignOut = () => {
    startTransition(async () => {
      clearKeyhausPrivateCaches();
      await signOutAction();
      router.push("/explore");
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#17211F]">Profile</h1>
        <p className="mt-1 text-sm text-[#5B6663]">
          {email ?? "Manage your contact details and Keyhaus role."}
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="prof-name">Full name</Label>
          <Input
            id="prof-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your full name"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prof-phone">Nigerian mobile number</Label>
          <Input
            id="prof-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0803 123 4567 or +2348031234567"
            required
          />
          <p className="text-xs text-[#5B6663]">
            Required before landlords can publish listings. Stored as +234...
          </p>
        </div>

        <div className="space-y-2">
          <Label>Account mode</Label>
          <div className="grid grid-cols-2 gap-2.5">
            {(
              [
                { value: "renter", label: "Looking for a place" },
                { value: "landlord", label: "Landlord" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRole(opt.value)}
                className={cn(
                  "min-h-[44px] rounded-[14px] border-[1.5px] px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                  role === opt.value
                    ? "border-[#0E6B5B] bg-[#DDEEE9] text-[#0E6B5B]"
                    : "border-[#E2DFD6] bg-white text-[#17211F]"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {feedback && (
          <p
            role={feedback.ok ? "status" : "alert"}
            className={cn(
              "text-sm font-medium",
              feedback.ok ? "text-[#0E6B5B]" : "text-[#B3261E]"
            )}
          >
            {feedback.text}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="w-full">
          <UserCheck className="h-4 w-4" strokeWidth={2} />
          <span>{isPending ? "Saving..." : "Save profile"}</span>
        </Button>
      </form>

      {!isStandalone && canPrompt && (
        <div className="flex items-center justify-between gap-3 rounded-[20px] border-[1.5px] border-[#E2DFD6] bg-white p-4">
          <div>
            <p className="font-heading text-sm font-bold text-[#17211F]">
              Install Keyhaus on your phone
            </p>
            <p className="text-xs text-[#5B6663]">
              Open saved homes and tours faster with offline access.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={triggerInstall}>
            <Download className="h-4 w-4" strokeWidth={2} />
            <span>Install</span>
          </Button>
        </div>
      )}

      <div className="rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#17211F]">
          <ShieldCheck className="h-4 w-4 text-[#0E6B5B]" strokeWidth={2} />
          <span>Trust &amp; legal</span>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-[#0E6B5B]">
          <Link href="/safety" className="underline underline-offset-4">
            Rental safety tips
          </Link>
          <Link href="/terms" className="underline underline-offset-4">
            Terms of Use
          </Link>
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleSignOut}
        disabled={isPending}
        className="w-full text-[#B3261E] hover:bg-[#FBE9E7]"
      >
        <LogOut className="h-4 w-4" strokeWidth={2} />
        <span>Sign out</span>
      </Button>
    </div>
  );
}
