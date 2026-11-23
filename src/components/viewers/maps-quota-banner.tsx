"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

declare global {
  interface Window {
    gm_authFailure?: () => void;
    __keyhausMapsTrapInstalled?: boolean;
  }
}

export function notifyMapsQuotaExceeded() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
  }
}

export function MapsQuotaBanner() {
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const onQuotaExceeded = () => setQuotaExceeded(true);
    window.addEventListener("gmp-quota-exceeded", onQuotaExceeded);

    if (!window.__keyhausMapsTrapInstalled) {
      window.__keyhausMapsTrapInstalled = true;

      const prevAuthFailure = window.gm_authFailure;
      window.gm_authFailure = () => {
        window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
        prevAuthFailure?.();
      };

      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        const joined = args.map((a) => String(a ?? "")).join(" ");
        if (
          joined.includes("OverQuotaMapError") ||
          joined.includes("QuotaExceededError") ||
          joined.includes("OVER_QUERY_LIMIT") ||
          joined.includes("RESOURCE_EXHAUSTED")
        ) {
          window.dispatchEvent(new CustomEvent("gmp-quota-exceeded"));
        }
        originalError.apply(console, args);
      };
    }

    return () => {
      window.removeEventListener("gmp-quota-exceeded", onQuotaExceeded);
    };
  }, []);

  if (!quotaExceeded) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 border-b border-[#E3A93B] bg-[#FBF4E4] px-4 py-2.5 text-xs text-[#17211F]"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-[#9B6B0A]"
            strokeWidth={2}
          />
          <p>
            Google Maps demo quota has been reached for now.{" "}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#0E6B5B] underline underline-offset-2"
            >
              View quota details
            </a>
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss map quota notice"
          onClick={() => setQuotaExceeded(false)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-[#E2DFD6] cursor-pointer"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
