"use client";

import { useEffect, useRef } from "react";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";
import type { RoomLink } from "@/types/database";

interface PanoramaCanvasProps {
  src: string;
  alt: string;
  links: RoomLink[];
  onSelectLink?: (toRoomId: string) => void;
  onPlaceHotspot?: (coords: { yaw: number; pitch: number }) => void;
  onReady?: () => void;
  panCommand?: { dx: number; dy: number; seq: number } | null;
}

export default function PanoramaCanvas({
  src,
  alt,
  links,
  onSelectLink,
  onPlaceHotspot,
  onReady,
  panCommand,
}: PanoramaCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<import("@photo-sphere-viewer/core").Viewer | null>(null);
  const markersRef = useRef<import("@photo-sphere-viewer/markers-plugin").MarkersPlugin | null>(
    null
  );

  const callbacksRef = useRef({ onSelectLink, onPlaceHotspot, onReady });
  callbacksRef.current = { onSelectLink, onPlaceHotspot, onReady };

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (!container) return;

    async function init() {
      const [{ Viewer }, { MarkersPlugin }] = await Promise.all([
        import("@photo-sphere-viewer/core"),
        import("@photo-sphere-viewer/markers-plugin"),
      ]);

      if (disposed || !container) return;

      const viewer = new Viewer({
        container,
        panorama: src,
        caption: alt,
        navbar: false,
        defaultZoomLvl: 45,
        mousewheel: true,
        touchmoveTwoFingers: false,
        plugins: [[MarkersPlugin, {}]],
      });

      viewerRef.current = viewer;
      const markersPlugin = viewer.getPlugin(MarkersPlugin) as InstanceType<
        typeof MarkersPlugin
      >;
      markersRef.current = markersPlugin;

      viewer.addEventListener("ready", () => {
        callbacksRef.current.onReady?.();
      });

      viewer.addEventListener("click", ({ data }) => {
        if (callbacksRef.current.onPlaceHotspot && data) {
          callbacksRef.current.onPlaceHotspot({
            yaw: Number(data.yaw.toFixed(4)),
            pitch: Number(data.pitch.toFixed(4)),
          });
        }
      });

      markersPlugin.addEventListener("select-marker", ({ marker }) => {
        const targetId = marker.data?.toRoomId as string | undefined;
        if (targetId) {
          callbacksRef.current.onSelectLink?.(targetId);
        }
      });
    }

    void init();

    return () => {
      disposed = true;
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
        markersRef.current = null;
      }
    };
  }, [src, alt]);

  useEffect(() => {
    const markersPlugin = markersRef.current;
    if (!markersPlugin) return;

    markersPlugin.clearMarkers();
    for (const link of links) {
      if (typeof link.yaw !== "number" || typeof link.pitch !== "number") continue;
      markersPlugin.addMarker({
        id: link.id,
        position: { yaw: link.yaw, pitch: link.pitch },
        html: `<button type="button" aria-label="${link.label.replace(/"/g, "&quot;")}" style="display:inline-flex;align-items:center;gap:6px;min-height:44px;min-width:44px;padding:0 12px;border-radius:9999px;background:#0E6B5B;color:#FFFFFF;border:2px solid #E3A93B;font-size:12px;font-weight:600;box-shadow:0 6px 16px rgba(0,0,0,0.35);cursor:pointer;white-space:nowrap;">&#8594; ${link.label.replace(/</g, "&lt;")}</button>`,
        anchor: "center center",
        data: { toRoomId: link.to_room_id },
      });
    }
  }, [links]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !panCommand) return;
    const pos = viewer.getPosition();
    viewer.rotate({
      yaw: pos.yaw + panCommand.dx,
      pitch: Math.max(-1.2, Math.min(1.2, pos.pitch + panCommand.dy)),
    });
  }, [panCommand]);

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label={`360 view: ${alt}`}
      className="h-full w-full select-none bg-[#17211F]"
    />
  );
}
