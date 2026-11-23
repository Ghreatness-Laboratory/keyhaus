"use client";

import { useEffect, useRef, useState } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Calendar, EyeOff, Lock, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { notifyMapsQuotaExceeded } from "./maps-quota-banner";

interface StreetViewPanelProps {
  listingTitle: string;
  area: string;
  canViewExactLocation: boolean;
  exactLatitude: number | null;
  exactLongitude: number | null;
}

function computeHeadingDegrees(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function formatImageDate(rawDate: string | undefined | null): string | null {
  if (!rawDate) return null;
  const match = /^(\d{4})-(\d{2})$/.exec(rawDate.trim());
  if (!match) return rawDate;
  const year = Number(match[1]);
  const monthIdx = Number(match[2]) - 1;
  if (monthIdx < 0 || monthIdx > 11) return rawDate;
  const date = new Date(Date.UTC(year, monthIdx, 1));
  return new Intl.DateTimeFormat("en-NG", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function StreetViewCanvasInner({
  targetLat,
  targetLng,
  heightClass,
}: {
  targetLat: number;
  targetLng: number;
  heightClass: string;
}) {
  const streetViewLib = useMapsLibrary("streetView");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [capturedDate, setCapturedDate] = useState<string | null>(null);
  const [copyright, setCopyright] = useState<string | null>(null);

  useEffect(() => {
    if (!streetViewLib || !containerRef.current) return;
    let disposed = false;
    let panorama: google.maps.StreetViewPanorama | null = null;

    const service = new streetViewLib.StreetViewService();
    const target = { lat: targetLat, lng: targetLng };

    service.getPanorama(
      {
        location: target,
        radius: 80,
        preference: streetViewLib.StreetViewPreference.NEAREST,
      },
      (data, svStatus) => {
        if (disposed || !containerRef.current) return;

        if (svStatus === streetViewLib.StreetViewStatus.OK && data?.location?.latLng) {
          const panoPos = {
            lat: data.location.latLng.lat(),
            lng: data.location.latLng.lng(),
          };
          const heading = computeHeadingDegrees(panoPos, target);

          panorama = new streetViewLib.StreetViewPanorama(containerRef.current, {
            position: panoPos,
            pov: { heading, pitch: 2 },
            zoom: 1,
            addressControl: false,
            fullscreenControl: false,
            motionTracking: false,
            showRoadLabels: true,
          });

          setCapturedDate(formatImageDate(data.imageDate));
          setCopyright(data.copyright ?? null);
          setStatus("ready");
        } else {
          if (String(svStatus).includes("OVER_QUERY_LIMIT")) {
            notifyMapsQuotaExceeded();
          }
          setStatus("unavailable");
        }
      }
    );

    return () => {
      disposed = true;
      if (panorama) {
        panorama.setVisible(false);
        panorama = null;
      }
    };
  }, [streetViewLib, targetLat, targetLng]);

  return (
    <div className="space-y-2">
      <div
        className={`relative w-full overflow-hidden rounded-[18px] bg-[#17211F] ${heightClass}`}
      >
        <div ref={containerRef} className="h-full w-full" />

        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#17211F] text-sm text-white/80">
            Checking Google Street View coverage...
          </div>
        )}

        {status === "unavailable" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#F6F4EF] p-6 text-center">
            <EyeOff className="h-8 w-8 text-[#5B6663]" strokeWidth={2} />
            <p className="font-heading text-sm font-bold text-[#17211F]">
              Street View is not available on this street yet
            </p>
            <p className="max-w-sm text-xs text-[#5B6663]">
              Google Street View has not captured roadside imagery close enough to
              this property. Check the Area View satellite map or room tour instead.
            </p>
          </div>
        )}
      </div>

      {status === "ready" && (capturedDate || copyright) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5B6663]">
          {capturedDate && (
            <span className="inline-flex items-center gap-1.5 font-medium text-[#17211F]">
              <Calendar className="h-3.5 w-3.5 text-[#0E6B5B]" strokeWidth={2} />
              <span>Captured: {capturedDate}</span>
            </span>
          )}
          {copyright && <span className="text-[11px]">{copyright}</span>}
        </div>
      )}
    </div>
  );
}

export default function StreetViewPanel({
  listingTitle,
  area,
  canViewExactLocation,
  exactLatitude,
  exactLongitude,
}: StreetViewPanelProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

  if (!canViewExactLocation) {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-6 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#DDEEE9] text-[#0E6B5B]">
          <Lock className="h-5 w-5" strokeWidth={2} />
        </span>
        <div className="space-y-1">
          <p className="font-heading text-base font-bold text-[#17211F]">
            Street View unlocks after viewing acceptance
          </p>
          <p className="max-w-sm text-xs leading-relaxed text-[#5B6663]">
            To protect the landlord&apos;s exact gate and street address in {area},
            Street View opens once your in-person viewing request is accepted.
          </p>
        </div>
      </div>
    );
  }

  if (typeof exactLatitude !== "number" || typeof exactLongitude !== "number") {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center gap-2 rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-6 text-center">
        <EyeOff className="h-7 w-7 text-[#5B6663]" strokeWidth={2} />
        <p className="font-heading text-sm font-bold text-[#17211F]">
          Exact Street View coordinates are not set yet
        </p>
        <p className="max-w-sm text-xs text-[#5B6663]">
          The landlord can save or update the street address to geocode exact Street
          View coverage.
        </p>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center gap-2 rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-6 text-center">
        <p className="font-heading text-base font-bold text-[#17211F]">
          Street View unavailable without Google Maps key
        </p>
        <p className="max-w-sm text-xs text-[#5B6663]">
          Set <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to
          load interactive Street View imagery.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-heading text-sm font-bold text-[#17211F]">
            Street View · {listingTitle}
          </p>
          <p className="text-xs text-[#5B6663]">
            Facing the property from the nearest Google Street View capture.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setFullscreen(true)}
        >
          <Maximize2 className="h-4 w-4" strokeWidth={2} />
          <span>Full screen</span>
        </Button>
      </div>

      <APIProvider apiKey={apiKey} region="NG" language="en">
        <StreetViewCanvasInner
          targetLat={exactLatitude}
          targetLng={exactLongitude}
          heightClass="h-[340px] sm:h-[400px]"
        />
      </APIProvider>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-4xl p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle>Street View · {listingTitle}</DialogTitle>
            <DialogDescription>
              Interactive street-level panorama oriented toward the property.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3">
            <APIProvider apiKey={apiKey} region="NG" language="en">
              <StreetViewCanvasInner
                targetLat={exactLatitude}
                targetLng={exactLongitude}
                heightClass="h-[68vh]"
              />
            </APIProvider>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
