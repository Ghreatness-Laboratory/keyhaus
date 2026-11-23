"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CalendarClock,
  Compass,
  Heart,
  Inbox,
  Plus,
  User,
} from "lucide-react";
import { KeyhausLogo } from "@/components/keyhaus-logo";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

interface AppShellProps {
  children: React.ReactNode;
  role?: UserRole | null;
  isSignedIn?: boolean;
  isWideBrowse?: boolean;
  hideBottomNav?: boolean;
}

export function AppShell({
  children,
  role,
  isSignedIn = false,
  isWideBrowse = false,
  hideBottomNav = false,
}: AppShellProps) {
  const pathname = usePathname();
  const isLandlord = role === "landlord";

  const renterTabs = [
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/saved", label: "Saved", icon: Heart },
    { href: "/viewings", label: "Viewings", icon: CalendarClock },
    { href: isSignedIn ? "/profile" : "/auth/signin", label: "Profile", icon: User },
  ];

  const landlordTabs = [
    { href: "/landlord", label: "My listings", icon: Building2 },
    { href: "/landlord/requests", label: "Requests", icon: Inbox },
    { href: "/landlord/new", label: "Add", icon: Plus },
    { href: "/profile", label: "Profile", icon: User },
  ];

  const tabs = isLandlord ? landlordTabs : renterTabs;

  return (
    <div className="min-h-screen bg-[#F6F4EF] text-[#17211F]">
      <header className="sticky top-0 z-30 border-b-[1.5px] border-[#E2DFD6] bg-[#F6F4EF]/95 backdrop-blur-sm">
        <div
          className={cn(
            "mx-auto flex h-14 items-center justify-between gap-6 px-6",
            isWideBrowse ? "max-w-6xl" : "max-w-[720px]"
          )}
        >
          <KeyhausLogo href={isLandlord ? "/landlord" : "/explore"} />

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-6 md:flex"
          >
            {tabs.map((tab) => {
              const active =
                pathname === tab.href ||
                (tab.href === "/explore" && pathname === "/") ||
                (tab.href !== "/landlord" && pathname.startsWith(tab.href + "/"));
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "inline-flex min-h-[44px] items-center whitespace-nowrap text-sm font-medium transition-colors",
                    active
                      ? "text-[#0E6B5B] underline decoration-[#E3A93B] decoration-2 underline-offset-8"
                      : "text-[#5B6663] hover:text-[#17211F]"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
            {isLandlord && (
              <Link
                href="/explore"
                className="inline-flex min-h-[44px] items-center whitespace-nowrap text-sm font-medium text-[#5B6663] hover:text-[#17211F]"
              >
                Browse
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {!isSignedIn ? (
              <Link
                href="/auth/signin"
                className="inline-flex min-h-[44px] items-center rounded-[14px] bg-[#0E6B5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a574a] whitespace-nowrap"
              >
                Sign in
              </Link>
            ) : (
              <Link
                href="/profile"
                className="inline-flex min-h-[44px] items-center rounded-full border-[1.5px] border-[#E2DFD6] bg-white px-3.5 text-xs font-medium text-[#17211F] hover:bg-[#DDEEE9] whitespace-nowrap"
              >
                {isLandlord ? "Landlord" : "Renter"}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto px-6 pt-5",
          hideBottomNav ? "pb-10" : "pb-24 md:pb-12",
          isWideBrowse ? "max-w-6xl" : "max-w-[720px]"
        )}
      >
        {children}
      </main>

      {!hideBottomNav && (
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-40 h-[72px] border-t-[1.5px] border-[#E2DFD6] bg-white/95 backdrop-blur-sm md:hidden"
        >
          <div className="mx-auto grid h-full max-w-[720px] grid-cols-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active =
                pathname === tab.href ||
                (tab.href === "/explore" && pathname === "/") ||
                (tab.href !== "/landlord" && pathname.startsWith(tab.href + "/"));
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "flex min-h-[44px] flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition-colors",
                    active ? "text-[#0E6B5B]" : "text-[#5B6663] hover:text-[#17211F]"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-7 w-11 items-center justify-center rounded-full transition-colors",
                      active ? "bg-[#DDEEE9]" : "bg-transparent"
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="truncate">{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
