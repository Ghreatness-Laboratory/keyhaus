import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const LISTING_PHOTOS_CACHE = "keyhaus-listing-photos-v1";
const SUPABASE_READS_CACHE = "keyhaus-data-reads-v1";
const PAGES_CACHE = "keyhaus-pages-v1";

const keyhausRuntimeCaching: RuntimeCaching[] = [
  // Never cache Supabase auth requests
  {
    matcher: ({ url }) => url.pathname.includes("/auth/v1/"),
    handler: new NetworkOnly(),
  },
  // Never cache non-GET requests (writes, uploads, server actions)
  {
    matcher: ({ request }) => request.method !== "GET",
    handler: new NetworkOnly(),
  },
  // Listing photos from Supabase Storage or local demo images
  {
    matcher: ({ url }) =>
      url.pathname.includes("/storage/v1/object/public/listing-photos/") ||
      url.pathname.startsWith("/images/"),
    handler: new StaleWhileRevalidate({
      cacheName: LISTING_PHOTOS_CACHE,
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new ExpirationPlugin({
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        }),
      ],
    }),
  },
  // Supabase data reads (REST/RPC GET): network first with 3s timeout
  {
    matcher: ({ url, request }) =>
      request.method === "GET" &&
      (url.pathname.includes("/rest/v1/") || url.pathname === "/api/listings"),
    handler: new NetworkFirst({
      cacheName: SUPABASE_READS_CACHE,
      networkTimeoutSeconds: 3,
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 60 * 60 * 24 * 7,
        }),
      ],
    }),
  },
  // Page navigations: network first falling back to /offline via Serwist fallbacks
  {
    matcher: ({ request }) => request.mode === "navigate",
    handler: new NetworkFirst({
      cacheName: PAGES_CACHE,
      networkTimeoutSeconds: 3,
      plugins: [
        new CacheableResponsePlugin({ statuses: [200] }),
        new ExpirationPlugin({
          maxEntries: 40,
          maxAgeSeconds: 60 * 60 * 24 * 7,
        }),
      ],
    }),
  },
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: keyhausRuntimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
  if (event.data && event.data.type === "CLEAR_PRIVATE_CACHES") {
    event.waitUntil(
      Promise.all([
        caches.delete(SUPABASE_READS_CACHE),
        caches.delete(PAGES_CACHE),
      ])
    );
  }
});

serwist.addEventListeners();
