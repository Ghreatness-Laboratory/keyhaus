"use client";

import { useEffect, useState } from "react";
import { Download, RefreshCw, Share, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const VISIT_COUNT_KEY = "keyhaus_visit_count";
const INSTALL_DISMISSED_KEY = "keyhaus_install_dismissed";

export function clearKeyhausPrivateCaches(): void {
  if (typeof window === "undefined") return;
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_PRIVATE_CACHES" });
  }
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return isOnline;
}

export function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isSecondVisitOrMore, setIsSecondVisitOrMore] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && !("MSStream" in window);
    setIsIOS(ios);

    try {
      const visits = Number(localStorage.getItem(VISIT_COUNT_KEY) ?? "0") + 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(visits));
      setIsSecondVisitOrMore(visits >= 2);
      setDismissed(localStorage.getItem(INSTALL_DISMISSED_KEY) === "1");
    } catch {
      setIsSecondVisitOrMore(false);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    } catch {
      // ignore storage quota errors
    }
  };

  const triggerInstall = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setDeferredPrompt(null);
      setIsStandalone(true);
      return true;
    }
    return false;
  };

  return {
    canPrompt: Boolean(deferredPrompt),
    isStandalone,
    isIOS,
    isSecondVisitOrMore,
    dismissed,
    dismiss,
    triggerInstall,
  };
}

export function PwaManager() {
  const isOnline = useOnlineStatus();
  const {
    canPrompt,
    isStandalone,
    isIOS,
    isSecondVisitOrMore,
    dismissed,
    dismiss,
    triggerInstall,
  } = usePwaInstallPrompt();
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let mounted = true;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg || !mounted) return;
      if (reg.waiting) {
        setWaitingWorker(reg.waiting);
      }
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener("statechange", () => {
          if (next.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(next);
          }
        });
      });
    });

    const onControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      mounted = false;
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const handleUpdateRefresh = () => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  };

  const showInstallBanner =
    !isStandalone && isSecondVisitOrMore && !dismissed && (canPrompt || isIOS);

  return (
    <>
      {!isOnline && (
        <div
          role="status"
          className="fixed inset-x-0 top-14 z-50 mx-auto flex w-fit items-center gap-2 rounded-full border-[1.5px] border-[#E2DFD6] bg-[#17211F] px-4 py-2 text-xs font-medium text-white shadow-md"
        >
          <WifiOff className="h-4 w-4 text-[#E3A93B]" strokeWidth={2} />
          <span>You are offline. Viewing saved and opened homes.</span>
        </div>
      )}

      {waitingWorker && (
        <div
          role="status"
          className="fixed bottom-20 left-4 right-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-[18px] border-[1.5px] border-[#0E6B5B] bg-white p-3.5 shadow-lg md:bottom-6"
        >
          <p className="text-sm font-medium text-[#17211F]">
            New version available. Refresh
          </p>
          <Button size="sm" onClick={handleUpdateRefresh}>
            <RefreshCw className="h-4 w-4" strokeWidth={2} />
            Refresh
          </Button>
        </div>
      )}

      {showInstallBanner && !waitingWorker && (
        <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto flex max-w-md items-center justify-between gap-3 rounded-[20px] border-[1.5px] border-[#E2DFD6] bg-white p-4 shadow-lg md:bottom-6">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/icon-192.png"
              alt="Keyhaus icon"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-[10px]"
            />
            <div className="min-w-0">
              <p className="font-heading text-sm font-semibold text-[#17211F]">
                Install Keyhaus
              </p>
              <p className="text-xs text-[#5B6663]">
                {isIOS
                  ? "Tap Share, then Add to Home Screen"
                  : "Save data and open toured homes offline."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {canPrompt ? (
              <Button size="sm" onClick={triggerInstall}>
                <Download className="h-4 w-4" strokeWidth={2} />
                Install
              </Button>
            ) : (
              <span className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#DDEEE9] text-[#0E6B5B]">
                <Share className="h-4 w-4" strokeWidth={2} />
              </span>
            )}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss install banner"
              className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full text-[#5B6663] hover:bg-[#F6F4EF]"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
