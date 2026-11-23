import Link from "next/link";
import { cn } from "@/lib/utils";

export function KeyhausLogo({
  href = "/explore",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E6B5B]",
        className
      )}
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M32 6L6 28H14V56H50V28H58L32 6Z"
          fill="#0E6B5B"
        />
        <circle cx="32" cy="31" r="5.5" fill="#E3A93B" />
        <path d="M29 34H35L37 47H27L29 34Z" fill="#E3A93B" />
      </svg>
      <span className="font-wordmark text-[21px] font-bold tracking-tight text-[#17211F]">
        Keyhaus
      </span>
    </Link>
  );
}
