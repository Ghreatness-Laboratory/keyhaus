"use client";

import { useState } from "react";
import { APIProvider, Circle, Map as GoogleMap } from "@vis.gl/react-google-maps";
import { Maximize2, Satellite, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AreaSatelliteViewProps {
  area: string;
  lga: string;
  state: string;
  approxLatitude: number;
  approxLongitude: number;
}

function SatelliteMapCanvas({
  approxLatitude,
  approxLongitude,
  apiKey,
  heightClass,
}: {
  approxLatitude: number;
  approxLongitude: number;
  apiKey: string;
  heightClass: string;
}) {
  const center = { lat: approxLatitude, lng: approxLongitude };

  return (
    <div className={`relative w-full overflow-hidden rounded-[18px] bg-[#17211F] ${heightClass}`}>
      <APIProvider apiKey={apiKey} region="NG" language="en">
        <GoogleMap
          defaultCenter={center}
          center={center}
          defaultZoom={15}
          mapTypeId="satellite"
          internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
          disableDefaultUI={false}
          streetViewControl={false}
          mapTypeControl={false}
          fullscreenControl={false}
          gestureHandling="cooperative"
          className="h-full w-full"
          style={{ width: "100%", height: "100%" }}
        >
          <Circle
            center={center}
            radius={400}
            strokeColor="#E3A93B"
            strokeOpacity={0.95}
            strokeWeight={2}
            fillColor="#0E6B5B"
            fillOpacity={0.22}
            clickable={false}
          />
        </GoogleMap>
      </APIProvider>
    </div>
  );
}

export default function AreaSatelliteView({
  area,
  lga,
  state,
  approxLatitude,
  approxLongitude,
}: AreaSatelliteViewProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

  if (!apiKey) {
    return (
      <div className="flex h-[320px] flex-col items-center justify-center gap-2 rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-6 text-center">
        <Satellite className="h-8 w-8 text-[#0E6B5B]" strokeWidth={2} />
        <p className="font-heading text-base font-bold text-[#17211F]">
          Satellite Area View ({area})
        </p>
        <p className="max-w-sm text-xs text-[#5B6663]">
          Add <code className="font-mono">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to
          preview the interactive satellite neighborhood circle for {area}, {lga},{" "}
          {state}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[22px] border-[1.5px] border-[#E2DFD6] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-heading text-sm font-bold text-[#17211F]">
            Area View · {area}, {state}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-[#5B6663]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#0E6B5B]" strokeWidth={2} />
            <span>
              Approximate ~400 m circle. Exact street location stays private until
              viewing is accepted.
            </span>
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

      <SatelliteMapCanvas
        approxLatitude={approxLatitude}
        approxLongitude={approxLongitude}
        apiKey={apiKey}
        heightClass="h-[340px] sm:h-[400px]"
      />

      <p className="text-[11px] text-[#5B6663]">
        Imagery and copyright attribution are provided directly by Google Maps inside
        the map frame.
      </p>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-4xl p-4 sm:p-5">
          <DialogHeader>
            <DialogTitle>Area View · {area}, {lga}</DialogTitle>
            <DialogDescription>
              Approximate neighborhood zone (~400 m radius) shown in satellite mode.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-3">
            <SatelliteMapCanvas
              approxLatitude={approxLatitude}
              approxLongitude={approxLongitude}
              apiKey={apiKey}
              heightClass="h-[68vh]"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
