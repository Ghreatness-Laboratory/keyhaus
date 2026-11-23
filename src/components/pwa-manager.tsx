"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Download, PlusSquare, RefreshCw, Share, Smartphone, WifiOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const VISIT_COUNT_KEY = "keyhaus_visit_count";
const INSTALL_DISMISSED_KEY = "keyhaus_install_dismissed";

// Module-level store so any mounted component (header button, profile card, banner)
// retains the captured beforeinstallprompt event across client-side navigations.
let sharedDeferredPrompt: BeforeInstallPromptEvent | null = null;
let sharedIsInstalled = false;
let sharedListenersInstalled = false;
const promptSubscribers = new Set<() => void>();

function notifyPromptSubscribers() {
  for (const listener of promptSubscribers) {
    listener();
  }
}

function ensureInstallEventListeners() {
  if (typeof window === "undefined" || sharedListenersInstalled) return;
  sharedListenersInstalled = true;

  sharedIsInstalled =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    sharedDeferredPrompt = e as BeforeInstallPromptEvent;
    notifyPromptSubscribers();
  });

  window.addEventListener("appinstalled", () => {
    sharedIsInstalled = true;
    sharedDeferredPrompt = null;
    notifyPromptSubscribers();
  });
}

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
    useState<BeforeInstallPromptEvent | null>(sharedDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState(sharedIsInstalled);
  const [isIOS, setIsIOS] = useState(false);
  const [isSecondVisitOrMore, setIsSecondVisitOrMore] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    ensureInstallEventListeners();

    const syncFromStore = () => {
      setDeferredPrompt(sharedDeferredPrompt);
      setIsStandalone(sharedIsInstalled);
    };
    syncFromStore();
    promptSubscribers.add(syncFromStore);

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

    return () => {
      promptSubscribers.delete(syncFromStore);
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
    const promptEvent = sharedDeferredPrompt ?? deferredPrompt;
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      sharedDeferredPrompt = null;
      sharedIsInstalled = true;
      notifyPromptSubscribers();
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

function IosInstallGuideDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install Keyhaus on iPhone or iPad</DialogTitle>
          <DialogDescription>
            Add Keyhaus to your home screen for full-screen browsing and offline access to opened homes.
          </DialogDescription>
        </DialogHeader>

        <ol className="mt-4 space-y-3 text-sm text-[#17211F]">
          <li className="flex items-start gap-3 rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-[#F6F4EF] p-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDEEE9] text-[#0E6B5B]">
              <Share className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <p className="font-semibold">1. Tap the Share icon</p>
              <p className="text-xs text-[#5B6663]">
                Find the Share button in Safari&apos;s bottom or top toolbar.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3 rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-[#F6F4EF] p-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DDEEE9] text-[#0E6B5B]">
              <PlusSquare className="h-4 w-4" strokeWidth={2} />
            </span>
            <div>
              <p className="font-semibold">2. Tap Add to Home Screen</p>
              <p className="text-xs text-[#5B6663]">
                Scroll the share sheet, choose &ldquo;Add to Home Screen&rdquo;, then tap Add.
              </p>
            </div>
          </li>
        </ol>

        <div className="mt-5">
          <Button type="button" className="w-full" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PWAInstallButton() {
  const { canPrompt, isStandalone, isIOS, triggerInstall } = usePwaInstallPrompt();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isStandalone) {
    return null;
  }

  if (canPrompt) {
    return (
      <button
        type="button"
        onClick={() => void triggerInstall()}
        aria-label="Install Keyhaus app"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-[#DDEEE9] px-3 text-xs font-semibold text-[#0E6B5B] transition-colors hover:bg-[#cfe6df] cursor-pointer whitespace-nowrap"
      >
        <Download className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="hidden sm:inline">Install app</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install Keyhaus on iOS"
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[14px] border-[1.5px] border-[#E2DFD6] bg-[#DDEEE9] px-3 text-xs font-semibold text-[#0E6B5B] transition-colors hover:bg-[#cfe6df] cursor-pointer whitespace-nowrap"
        >
          <Smartphone className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span className="hidden sm:inline">Install app</span>
        </button>
        <IosInstallGuideDialog open={showIOSGuide} onOpenChange={setShowIOSGuide} />
      </>
    );
  }

  return null;
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
  const [showIOSGuide, setShowIOSGuide] = useState(false);

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
            <Image
              src="/icon-192.png"
              alt="Keyhaus icon"
              width={40}
              height={40}
              referrerPolicy="no-referrer"
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
              <Button size="sm" onClick={() => void triggerInstall()}>
                <Download className="h-4 w-4" strokeWidth={2} />
                Install
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowIOSGuide(true)}
                aria-label="How to install on iOS"
              >
                <Share className="h-4 w-4" strokeWidth={2} />
                How to
              </Button>
            )}
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss install banner"
              className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-full text-[#5B6663] hover:bg-[#F6F4EF] cursor-pointer"
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      <IosInstallGuideDialog open={showIOSGuide} onOpenChange={setShowIOSGuide} />
    </>
  );
}
