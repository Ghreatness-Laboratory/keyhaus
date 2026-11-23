"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Compass } from "lucide-react";

interface DepthParallaxViewerProps {
  imageUrl: string;
  depthUrl: string;
  alt: string;
  heightClass?: string;
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform sampler2D uDepth;
  uniform vec2 uOffset;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    float depth = texture2D(uDepth, vUv).r;
    vec2 displacedUv = vUv + (depth - 0.5) * uOffset * uIntensity;
    displacedUv = clamp(displacedUv, vec2(0.015), vec2(0.985));
    gl_FragColor = texture2D(uTexture, displacedUv);
  }
`;

interface DeviceOrientationConstructorWithPermission {
  requestPermission?: () => Promise<"granted" | "denied">;
}

export default function DepthParallaxViewer({
  imageUrl,
  depthUrl,
  alt,
  heightClass = "h-[340px] sm:h-[400px]",
}: DepthParallaxViewerProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const targetOffsetRef = useRef({ x: 0, y: 0 });
  const [webglFailed, setWebglFailed] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [needsIosPermission, setNeedsIosPermission] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ctor = window.DeviceOrientationEvent as unknown as
      | DeviceOrientationConstructorWithPermission
      | undefined;
    if (ctor && typeof ctor.requestPermission === "function") {
      setNeedsIosPermission(true);
    }
  }, []);

  useEffect(() => {
    if (!motionEnabled || typeof window === "undefined") return;
    const onOrientation = (e: DeviceOrientationEvent) => {
      const gamma = typeof e.gamma === "number" ? e.gamma : 0; // left-right tilt
      const beta = typeof e.beta === "number" ? e.beta - 45 : 0; // front-back tilt
      targetOffsetRef.current = {
        x: Math.max(-1, Math.min(1, gamma / 35)),
        y: Math.max(-1, Math.min(1, beta / 35)),
      };
    };
    window.addEventListener("deviceorientation", onOrientation);
    return () => window.removeEventListener("deviceorientation", onOrientation);
  }, [motionEnabled]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    let rafId = 0;

    // Detect software WebGL rasterizers per Three.js runtime rules
    let isSoftwareGl = false;
    try {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2") || probe.getContext("webgl");
      if (!gl) {
        setWebglFailed(true);
        return;
      }
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        const rendererStr = String(
          gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? ""
        );
        isSoftwareGl =
          /SwiftShader|llvmpipe|Software|Microsoft Basic Render/i.test(rendererStr);
      }
    } catch {
      setWebglFailed(true);
      return;
    }

    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 240);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "low-power",
      alpha: false,
    });
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin("anonymous");

    const colorTex = loader.load(
      imageUrl,
      () => {
        colorTex.colorSpace = THREE.SRGBColorSpace;
        colorTex.minFilter = THREE.LinearFilter;
        colorTex.magFilter = THREE.LinearFilter;
      },
      undefined,
      () => {
        if (!disposed) setWebglFailed(true);
      }
    );

    const depthTex = loader.load(
      depthUrl,
      () => {
        depthTex.colorSpace = THREE.NoColorSpace;
        depthTex.minFilter = THREE.LinearFilter;
        depthTex.magFilter = THREE.LinearFilter;
      },
      undefined,
      () => {
        if (!disposed) setWebglFailed(true);
      }
    );

    const uniforms = {
      uTexture: { value: colorTex },
      uDepth: { value: depthTex },
      uOffset: { value: new THREE.Vector2(0, 0) },
      uIntensity: { value: 0.032 },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
    });

    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    const currentOffset = { x: 0, y: 0 };
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderFrame = () => {
      if (disposed) return;
      const target = prefersReducedMotion
        ? { x: 0, y: 0 }
        : targetOffsetRef.current;
      currentOffset.x += (target.x - currentOffset.x) * 0.12;
      currentOffset.y += (target.y - currentOffset.y) * 0.12;
      uniforms.uOffset.value.set(currentOffset.x, currentOffset.y);

      renderer.render(scene, camera);

      if (!isSoftwareGl && !prefersReducedMotion) {
        rafId = window.requestAnimationFrame(renderFrame);
      } else if (
        Math.abs(target.x - currentOffset.x) > 0.002 ||
        Math.abs(target.y - currentOffset.y) > 0.002
      ) {
        rafId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    const observer = new ResizeObserver(() => {
      if (disposed || !container) return;
      const w = Math.max(container.clientWidth, 320);
      const h = Math.max(container.clientHeight, 240);
      renderer.setSize(w, h);
      renderer.render(scene, camera);
    });
    observer.observe(container);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      colorTex.dispose();
      depthTex.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [imageUrl, depthUrl]);

  const handleRequestMotion = async () => {
    const ctor = window.DeviceOrientationEvent as unknown as
      | DeviceOrientationConstructorWithPermission
      | undefined;
    if (ctor && typeof ctor.requestPermission === "function") {
      try {
        const res = await ctor.requestPermission();
        if (res === "granted") {
          setMotionEnabled(true);
          setNeedsIosPermission(false);
        }
      } catch {
        // Ignore denied permissions cleanly
      }
    } else {
      setMotionEnabled((prev) => !prev);
    }
  };

  if (webglFailed) {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-[18px] bg-[#17211F] ${heightClass}`}
      >
        <img
          src={imageUrl}
          alt={alt}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
          targetOffsetRef.current = { x: nx, y: ny };
        }}
        onPointerLeave={() => {
          if (!motionEnabled) {
            targetOffsetRef.current = { x: 0, y: 0 };
          }
        }}
        className={`relative w-full touch-pan-y overflow-hidden rounded-[18px] bg-[#17211F] ${heightClass}`}
        aria-label={`2.5D depth view of ${alt}`}
      >
        <div ref={mountRef} className="h-full w-full" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5B6663]">
        <span>Move pointer or drag gently to feel depth parallax.</span>
        {(needsIosPermission || motionEnabled) && (
          <button
            type="button"
            onClick={handleRequestMotion}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border-[1.5px] border-[#E2DFD6] bg-white px-3 text-xs font-medium text-[#17211F] hover:bg-[#DDEEE9] cursor-pointer"
          >
            <Compass className="h-3.5 w-3.5 text-[#0E6B5B]" strokeWidth={2} />
            <span>{motionEnabled ? "Tilt active" : "Enable tilt motion"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
