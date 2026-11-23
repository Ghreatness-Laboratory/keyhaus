import Link from "next/link";
import { WifiOff } from "lucide-react";
import { KeyhausLogo } from "@/components/keyhaus-logo";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F6F4EF] px-6 text-center text-[#17211F]">
      <div className="w-full max-w-md rounded-[24px] border-[1.5px] border-[#E2DFD6] bg-white p-8 space-y-4">
        <div className="flex justify-center">
          <KeyhausLogo href="/explore" />
        </div>
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#DDEEE9] text-[#0E6B5B]">
          <WifiOff className="h-6 w-6" strokeWidth={2} />
        </div>
        <h1 className="font-heading text-xl font-bold text-[#17211F]">
          You are offline
        </h1>
        <p className="text-sm text-[#5B6663]">
          Check your mobile data or Wi-Fi connection. Listings, tours, and saved homes
          you already opened remain available offline.
        </p>
        <div className="flex flex-col gap-2 pt-2">
          <Button asChild>
            <Link href="/saved">Open Saved homes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/explore">Try Explore again</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
